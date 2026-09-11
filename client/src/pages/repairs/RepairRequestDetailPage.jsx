import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, ErrorState, StatusBadge } from '../../components/ui';
import { toast } from 'sonner';
import {
  getStatusConfig,
  JOURNEY_STAGES,
  getStageProgress,
} from '../../utils/repairStatusConfig';
import {
  ArrowLeft,
  Sparkles,
  Shield,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Users,
  Star,
  MessageCircle,
  ChevronRight,
  MoreVertical,
  Calendar,
  Wrench,
  Package,
  Award,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  RotateCcw,
  HelpCircle,
  FileText,
  DollarSign,
  Layers,
  ThumbsUp,
  AlertCircle,
  X,
  Loader2,
  CheckSquare,
  PackageCheck,
  UserCheck,
} from 'lucide-react';
import RepairConversation from '../../components/chat/RepairConversation';
import QuotationBuilderModal from '../../components/quotations/QuotationBuilderModal';
import InspectionReportModal from '../../components/jobs/InspectionReportModal';
import CostApprovalModal from '../../components/jobs/CostApprovalModal';
import PartsTrackerModal from '../../components/jobs/PartsTrackerModal';
import QualityCheckModal from '../../components/jobs/QualityCheckModal';
import AssignTechnicianModal from '../../components/repairs/AssignTechnicianModal';

export default function RepairRequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modals & UI state
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showCostApprovalModal, setShowCostApprovalModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showQualityCheckModal, setShowQualityCheckModal] = useState(false);
  const [showPrePublishModal, setShowPrePublishModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedQuoteForAccept, setSelectedQuoteForAccept] = useState(null);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [communicationRating, setCommunicationRating] = useState(5);
  const [serviceQualityRating, setServiceQualityRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);

  // Dispute Form state
  const [disputeCategory, setDisputeCategory] = useState('quality');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesiredResolution, setDisputeDesiredResolution] = useState('');

  // 1. Fetch Repair Request Details
  const { data, isLoading, error } = useQuery({
    queryKey: ['repair-request', id],
    queryFn: () => api.get(`/repair-requests/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const rr = data?.repairRequest;
  const currentUserId = (user?.userId || user?._id)?.toString();
  const ownerId = (rr?.owner?._id || rr?.owner)?.toString();
  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId);
  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const canManageAssignment = isOwner || isAdmin;
  const analysis = rr?.aiAnalysis;
  const statusConfig = getStatusConfig(rr?.requestStatus);
  const currentStageIndex = getStageProgress(rr?.requestStatus);

  const resolvedPrimaryAction = statusConfig.primaryAction
    ? (isOwner
        ? (statusConfig.primaryAction.owner || statusConfig.primaryAction)
        : isTechnician
        ? statusConfig.primaryAction.technician
        : statusConfig.primaryAction.admin || statusConfig.primaryAction.owner || statusConfig.primaryAction)
    : null;

  const resolvedSecondaryAction = statusConfig.secondaryAction
    ? (isOwner
        ? (statusConfig.secondaryAction.owner || statusConfig.secondaryAction)
        : isTechnician
        ? statusConfig.secondaryAction.technician
        : statusConfig.secondaryAction.admin || statusConfig.secondaryAction.owner || statusConfig.secondaryAction)
    : null;

  // 2. Fetch Quotations if in quote/active stages
  const { data: quotesData } = useQuery({
    queryKey: ['quotations', id],
    queryFn: () => api.get(`/repair-requests/${id}/quotations`).then((r) => r.data.data),
    enabled: !!id && !['draft', 'awaiting_ai_analysis', 'awaiting_owner_review', 'awaiting_clarification'].includes(rr?.requestStatus),
  });

  const quotations = quotesData?.quotations || [];

  // 3. Fetch Repair Job if quotation accepted
  const { data: jobsData } = useQuery({
    queryKey: ['repair-jobs', id],
    queryFn: () => api.get(`/repair-jobs?repairRequest=${id}`).then((r) => r.data.data),
    enabled: !!id && ['quotation_accepted', 'appointment_scheduled', 'under_inspection', 'awaiting_owner_approval', 'waiting_for_parts', 'repair_in_progress', 'quality_check', 'ready_for_collection', 'completed', 'disputed'].includes(rr?.requestStatus),
  });

  const activeJob = jobsData?.repairJobs?.[0];

  // 4. Fetch Warranties if completed
  const { data: warrantyData } = useQuery({
    queryKey: ['warranties', id],
    queryFn: () => api.get(`/warranties`).then((r) => r.data.data),
    enabled: !!id && rr?.requestStatus === 'completed',
  });

  const activeWarranty = warrantyData?.warranties?.find(
    (w) => w.repairJob?._id === activeJob?._id || w.repairJob === activeJob?._id
  );

  // Mutations
  const analyzeMutation = useMutation({
    mutationFn: () => api.post(`/repair-requests/${id}/analyze`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['repair-request', id]);
      if (res.data.data.aiBlocked) {
        toast.warning('Safety concerns detected. AI advice restricted.');
      } else {
        toast.success('AI analysis completed successfully!');
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Analysis failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/repair-requests/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      queryClient.invalidateQueries(['repair-requests']);
      setShowPrePublishModal(false);
      toast.success('Request published to verified technicians!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to publish'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/repair-requests/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      queryClient.invalidateQueries(['repair-requests']);
      toast.success('Request cancelled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const acceptQuotationMutation = useMutation({
    mutationFn: (quoteId) => api.post(`/quotations/${quoteId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      queryClient.invalidateQueries(['quotations', id]);
      queryClient.invalidateQueries(['repair-jobs', id]);
      setSelectedQuoteForAccept(null);
      toast.success('Quotation accepted! Proceed to schedule handover.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to accept quotation'),
  });

  const confirmCompletionMutation = useMutation({
    mutationFn: () => api.post(`/repair-jobs/${activeJob?._id}/confirm-completion`),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      queryClient.invalidateQueries(['repair-jobs', id]);
      toast.success('Repair confirmed! Digital warranty is now active.');
      setShowReviewModal(true);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to confirm completion'),
  });

  const submitReviewMutation = useMutation({
    mutationFn: (payload) => api.post(`/repair-jobs/${activeJob?._id}/reviews`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      setShowReviewModal(false);
      toast.success('Thank you! Your review has been published.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit review'),
  });

  const submitDisputeMutation = useMutation({
    mutationFn: (payload) => api.post(`/repair-jobs/${activeJob?._id}/disputes`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      setShowDisputeModal(false);
      toast.warning('Dispute ticket opened. An administrator will mediate.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to open dispute'),
  });

  // Calculate quotation comparison highlights
  const quotationHighlights = useMemo(() => {
    if (!quotations.length) return {};
    let lowestPrice = quotations[0];
    let fastestTurnaround = quotations[0];
    let bestWarranty = quotations[0];

    quotations.forEach((q) => {
      const qTotal = (q.laborCostMinimum || 0) + (q.partsEstimate || 0);
      const lowTotal = (lowestPrice.laborCostMinimum || 0) + (lowestPrice.partsEstimate || 0);
      if (qTotal < lowTotal) lowestPrice = q;

      const qDuration = q.expectedDuration?.value || 999;
      const fastDuration = fastestTurnaround.expectedDuration?.value || 999;
      if (qDuration < fastDuration) fastestTurnaround = q;

      if ((q.warrantyDays || 0) > (bestWarranty.warrantyDays || 0)) bestWarranty = q;
    });

    return {
      lowestPriceId: lowestPrice._id,
      fastestId: fastestTurnaround._id,
      bestWarrantyId: bestWarranty._id,
    };
  }, [quotations]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => queryClient.invalidateQueries(['repair-request', id])} />;

  // Determine if conversation is accessible
  const showConversation =
    rr &&
    !['draft', 'awaiting_ai_analysis', 'awaiting_owner_review', 'awaiting_clarification'].includes(
      rr.requestStatus
    );

  // Primary & secondary action click router
  const handleActionClick = (actionName) => {
    switch (actionName) {
      case 'analyze':
        analyzeMutation.mutate();
        break;
      case 'publish_review':
        setShowPrePublishModal(true);
        break;
      case 'edit':
      case 'edit_ai':
        navigate(`/repair-requests/new?edit=${id}`);
        break;
      case 'view_matches':
        navigate(`/repair-requests/${id}/matches`);
        break;
      case 'scroll_quotes':
        document.getElementById('quotations-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'assign_technician':
        setShowAssignModal(true);
        break;
      case 'confirm_completion':
        confirmCompletionMutation.mutate();
        break;
      case 'leave_review':
        setShowReviewModal(true);
        break;
      case 'open_dispute':
        setShowDisputeModal(true);
        break;
      case 'cancel':
        if (window.confirm('Are you sure you want to cancel this repair request?')) {
          cancelMutation.mutate();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="page-container max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Top Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          onClick={() => navigate('/repair-requests')}
          className="btn-ghost btn-sm -ml-2 text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
          aria-label="Back to requests"
        >
          <ArrowLeft className="w-4 h-4" /> All Requests
        </button>

        <div className="flex items-center gap-2">
          <StatusBadge status={rr?.requestStatus} />
          <span className="text-xs text-gray-400 font-mono hidden sm:inline">#{rr?._id?.slice(-6)}</span>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_410px] gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Unified Repair Lifecycle Command Center */}
        {/* ========================================================================= */}
        <div className="space-y-6 min-w-0">
          {/* 1. LIFECYCLE STEPPER HEADER */}
          <div className="card p-4 sm:p-6 bg-gradient-to-b from-white to-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
                  {rr?.item?.title || 'Repair Request'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Category: <span className="font-semibold text-gray-700">{rr?.item?.category?.name || 'General'}</span> • Created {new Date(rr?.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Status Indicator Chip */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-gray-600">Stage:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.badgeClass}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="pt-5">
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {JOURNEY_STAGES.map((stage, idx) => {
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const isUpcoming = idx > currentStageIndex;

                  return (
                    <div key={stage.id} className="flex flex-col items-center text-center">
                      <div className="w-full flex items-center mb-2">
                        <div
                          className={`h-2 w-full rounded-full transition-all duration-300 ${
                            isPast
                              ? 'bg-emerald-500'
                              : isCurrent
                              ? 'bg-primary-600 ring-2 ring-primary-300 animate-pulse'
                              : 'bg-gray-200'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-semibold truncate max-w-full ${
                          isCurrent
                            ? 'text-primary-700 font-bold'
                            : isPast
                            ? 'text-emerald-700 font-medium'
                            : 'text-gray-400'
                        }`}
                      >
                        <span className="hidden sm:inline">{stage.label}</span>
                        <span className="sm:hidden">{stage.shortLabel}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. ACTION REQUIRED HERO BANNER */}
          <div className="bg-gradient-to-r from-primary-50 via-emerald-50 to-teal-50 border border-primary-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary-800">
                    Required Next Action
                  </h2>
                </div>
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {isOwner
                    ? statusConfig.requiredAction.owner
                    : isTechnician
                    ? statusConfig.requiredAction.technician
                    : statusConfig.requiredAction.admin}
                </p>
                {statusConfig.contextualHelp && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5 pt-0.5">
                    <HelpCircle className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                    <span>{statusConfig.contextualHelp}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {canManageAssignment && resolvedPrimaryAction?.label && (
                  <button
                    onClick={() => handleActionClick(resolvedPrimaryAction.action)}
                    disabled={analyzeMutation.isPending || publishMutation.isPending}
                    className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    {analyzeMutation.isPending || publishMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      resolvedPrimaryAction.icon && <resolvedPrimaryAction.icon className="w-4 h-4" />
                    )}
                    <span>{resolvedPrimaryAction.label}</span>
                  </button>
                )}

                {canManageAssignment && resolvedSecondaryAction?.label && (
                  <button
                    onClick={() => handleActionClick(resolvedSecondaryAction.action)}
                    className="btn-outline btn-sm bg-white hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    {resolvedSecondaryAction.icon && <resolvedSecondaryAction.icon className="w-4 h-4" />}
                    <span>{resolvedSecondaryAction.label}</span>
                  </button>
                )}

                {/* Direct Assign Technician Button */}
                {canManageAssignment && !rr?.selectedQuotation && !activeJob && ['published', 'matching_technicians', 'awaiting_quotations', 'quotations_received'].includes(rr?.requestStatus) && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="btn-secondary btn-sm flex items-center gap-1.5 shadow-xs bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 active:scale-95 font-bold"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Assign Technician</span>
                  </button>
                )}

                {/* Technician Actions */}
                {isTechnician && !activeJob && (
                  <button
                    onClick={() => setShowQuotationModal(true)}
                    className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm shadow-primary-500/20 active:scale-95"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Submit Quotation Proposal</span>
                  </button>
                )}

                {isTechnician && activeJob && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeJob.currentStatus === 'pending_inspection' && (
                      <button
                        onClick={() => setShowInspectionModal(true)}
                        className="btn-primary btn-sm flex items-center gap-1.5"
                      >
                        <Wrench className="w-4 h-4" /> Record Inspection
                      </button>
                    )}
                    {['inspecting', 'in_progress', 'waiting_for_parts'].includes(activeJob.currentStatus) && (
                      <>
                        <button
                          onClick={() => setShowCostApprovalModal(true)}
                          className="btn-secondary btn-sm flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-4 h-4 text-amber-600" /> Cost Revision
                        </button>
                        <button
                          onClick={() => setShowPartsModal(true)}
                          className="btn-secondary btn-sm flex items-center gap-1.5"
                        >
                          <Package className="w-4 h-4 text-blue-600" /> Parts Tracker
                        </button>
                      </>
                    )}
                    {['in_progress', 'quality_check'].includes(activeJob.currentStatus) && (
                      <button
                        onClick={() => setShowQualityCheckModal(true)}
                        className="btn-primary btn-sm flex items-center gap-1.5"
                      >
                        <CheckSquare className="w-4 h-4" /> Quality Check
                      </button>
                    )}
                  </div>
                )}

                {/* Overflow Action Menu */}
                {isOwner && statusConfig.overflowActions?.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setOverflowMenuOpen(!overflowMenuOpen)}
                      className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95"
                      aria-label="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {overflowMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setOverflowMenuOpen(false)} />
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 text-xs">
                          {statusConfig.overflowActions.includes('cancel') && (
                            <button
                              onClick={() => {
                                setOverflowMenuOpen(false);
                                handleActionClick('cancel');
                              }}
                              className="w-full text-left px-3.5 py-2 text-danger-600 hover:bg-danger-50 flex items-center gap-2"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancel Request
                            </button>
                          )}
                          {statusConfig.overflowActions.includes('dispute') && (
                            <button
                              onClick={() => {
                                setOverflowMenuOpen(false);
                                handleActionClick('open_dispute');
                              }}
                              className="w-full text-left px-3.5 py-2 text-danger-600 hover:bg-danger-50 flex items-center gap-2"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Open Dispute
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile / Tablet Quick Chat Banner (< xl screens) */}
          {showConversation && (
            <div className="xl:hidden">
              <Link
                to={`/repair-requests/${id}/messages`}
                className="card card-body bg-gradient-to-r from-emerald-50 via-teal-50 to-primary-50 border-emerald-200 hover:border-emerald-300 p-4 flex items-center justify-between gap-4 transition-all shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Chat with {isOwner ? 'Technician' : 'Item Owner'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Open real-time repair discussion
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs shrink-0">
                  <span>Open Chat</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </div>
          )}

          {/* 3. ITEM PHOTOS & OVERVIEW */}
          <div className="card card-body space-y-4">
            <h2 className="section-title">Item Overview & Problem Details</h2>

            {/* Photos */}
            {rr?.item?.images?.length > 0 && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {rr.item.images.map((img, idx) => (
                  <a
                    key={idx}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden shrink-0 border border-gray-200 block shadow-xs hover:opacity-95 transition-opacity"
                    title="Click to enlarge"
                  >
                    <img
                      src={img.url}
                      alt="Item photo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </a>
                ))}
              </div>
            )}

            {/* Problem Description */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">Problem Description</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {rr?.problemDescription}
              </p>
            </div>

            {/* Event Before & Attempts */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {rr?.eventBeforeIssue && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-semibold text-gray-500 block mb-0.5">Event before issue:</span>
                  <span className="text-gray-700">{rr.eventBeforeIssue}</span>
                </div>
              )}
              {rr?.previousRepairAttempts && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-semibold text-gray-500 block mb-0.5">Previous attempts:</span>
                  <span className="text-gray-700">{rr.previousRepairAttempts}</span>
                </div>
              )}
            </div>

            {/* Budget & Service Method */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 text-xs">
              <div>
                <span className="text-gray-500 block">Condition</span>
                <span className="font-bold text-gray-900 capitalize">{rr?.item?.condition || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Budget Range</span>
                <span className="font-bold text-gray-900">
                  {rr?.budgetMinimum ? `৳${rr.budgetMinimum} – ৳${rr.budgetMaximum}` : 'Flexible'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Service Method</span>
                <span className="font-bold text-gray-900 capitalize">{rr?.preferredServiceMethod || 'Any'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Location Area</span>
                <span className="font-bold text-gray-900">{rr?.owner?.city || 'Dhaka, BD'}</span>
              </div>
            </div>
          </div>

          {/* 4. SAFETY SCREENING FLAGS */}
          {rr?.safetyFlags?.length > 0 && (
            <div className="bg-danger-50 border border-danger-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger-600 shrink-0" />
                <h3 className="font-bold text-danger-900 text-sm">Safety Screening Warnings</h3>
              </div>
              <div className="space-y-2">
                {rr.safetyFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-danger-800">
                    <Shield className="w-4 h-4 text-danger-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="badge-red mr-2">{flag.severity}</span>
                      <span>{flag.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. AI DIAGNOSTICS CARD */}
          {analysis && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-purple-50/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900 text-sm">AI Preliminary Fault Diagnosis</h3>
                </div>
                <span className="badge-purple">{analysis.confidence || 0}% confidence</span>
              </div>
              <div className="p-5 space-y-4 text-xs">
                {/* Extracted Symptoms */}
                {analysis.extractedSymptoms?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-600 uppercase tracking-wider mb-2">Identified Symptoms</h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {analysis.extractedSymptoms.map((s, i) => (
                        <div key={i} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-2">
                          <span className="text-gray-800 font-medium">{s.description}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.severity === 'high' ? 'badge-red' : s.severity === 'medium' ? 'badge-yellow' : 'badge-green'
                          }`}>
                            {s.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inspection Areas & Skills */}
                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  {analysis.possibleInspectionAreas?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-600 uppercase tracking-wider mb-2">Suggested Inspection Points</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.possibleInspectionAreas.map((area, i) => (
                          <span key={i} className="badge-blue">{area}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.recommendedTechnicianSkills?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-600 uppercase tracking-wider mb-2">Recommended Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.recommendedTechnicianSkills.map((sk, i) => (
                          <span key={i} className="badge-green">{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 italic pt-2 border-t border-gray-50">
                  Disclaimer: AI preliminary analysis is advisory and subject to technician physical verification.
                </p>
              </div>
            </div>
          )}

          {/* 6. SMART QUOTATION COMPARISON SECTION */}
          {quotations.length > 0 && (
            <div id="quotations-section" className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-gray-900 text-sm">
                    Received Quotations ({quotations.length})
                  </h3>
                </div>
                {canManageAssignment && !rr?.selectedQuotation && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="btn-outline btn-xs flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800 bg-white"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Directly Assign Someone Else
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {quotations.map((q) => {
                  const isAccepted = q.status === 'accepted' || rr?.selectedQuotation?._id === q._id || rr?.selectedQuotation === q._id;
                  const isLowestPrice = quotationHighlights.lowestPriceId === q._id;
                  const isFastest = quotationHighlights.fastestId === q._id;
                  const isBestWarranty = quotationHighlights.bestWarrantyId === q._id;

                  return (
                    <div key={q._id} className={`p-4 sm:p-5 transition-colors ${isAccepted ? 'bg-emerald-50/40 border-l-4 border-emerald-600' : 'hover:bg-gray-50/50'}`}>
                      {/* Technician & Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shadow-inner">
                            {q.technician?.fullName?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <Link
                              to={`/technicians/${q.technician?._id || q.technician}`}
                              className="font-bold text-sm text-gray-900 hover:text-primary-600 flex items-center gap-1.5"
                            >
                              <span>{q.technician?.fullName || 'Verified Technician'}</span>
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            </Link>
                            <p className="text-xs text-gray-500">
                              Quoted on {new Date(q.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Comparison Highlight Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isAccepted && <span className="badge-green font-bold">Accepted Proposal</span>}
                          {isLowestPrice && <span className="badge-blue font-semibold">Lowest Price</span>}
                          {isFastest && <span className="badge-purple font-semibold">Fastest Turnaround</span>}
                          {isBestWarranty && <span className="badge-yellow font-semibold">Longest Warranty</span>}
                        </div>
                      </div>

                      {/* Pricing & Terms Breakdown Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-center">
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Labor Estimate</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">৳{q.laborCostMinimum}–{q.laborCostMaximum}</p>
                        </div>
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Parts Estimate</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">৳{q.partsEstimate || 0}</p>
                        </div>
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Turnaround</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            {q.expectedDuration?.value} {q.expectedDuration?.unit || 'days'}
                          </p>
                        </div>
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase font-bold text-gray-500">Warranty</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">{q.warrantyDays || 30} Days</p>
                        </div>
                      </div>

                      {q.technicianNotes && (
                        <p className="text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 my-2">
                          <span className="font-semibold text-gray-700">Technician Note:</span> {q.technicianNotes}
                        </p>
                      )}

                      {/* Accept Proposal Button for Owner / Admin */}
                      {canManageAssignment && ['submitted', 'revised'].includes(q.status) && !rr?.selectedQuotation && (
                        <div className="pt-3 border-t border-gray-100 mt-2">
                          <button
                            onClick={() => setSelectedQuoteForAccept(q)}
                            className="btn-primary btn-sm w-full flex items-center justify-center gap-2 py-2.5 font-bold shadow-xs hover:shadow-md transition-all active:scale-98"
                          >
                            <CheckCircle className="w-4 h-4" /> Assign to {q.technician?.fullName || 'Technician'} & Accept Quotation
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Assignment Banner when no quotations yet */}
          {quotations.length === 0 && canManageAssignment && !rr?.selectedQuotation && !activeJob && ['published', 'matching_technicians', 'awaiting_quotations'].includes(rr?.requestStatus) && (
            <div className="card p-5 bg-gradient-to-r from-primary-50/60 via-emerald-50/40 to-teal-50/60 border border-primary-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Want to assign a specialist directly?</h4>
                  <p className="text-xs text-gray-500">You don't have to wait for quotes. You can select and assign any verified technician right now.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className="btn-primary btn-sm shrink-0 flex items-center gap-1.5 shadow-sm font-bold active:scale-95"
              >
                <UserCheck className="w-4 h-4" /> Assign Technician Now
              </button>
            </div>
          )}

          {/* 7. ACTIVE REPAIR JOB & INSPECTION TRACKING */}
          {activeJob && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Active Repair Job Progress</h3>
                </div>
                <StatusBadge status={activeJob.currentStatus} />
              </div>

              {/* Technician Info */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    {activeJob.technician?.fullName?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{activeJob.technician?.fullName}</h4>
                    <p className="text-xs text-gray-500">Assigned Technician</p>
                  </div>
                </div>
                <Link to={`/repair-requests/${id}/messages`} className="btn-secondary btn-sm text-xs">
                  <MessageCircle className="w-3.5 h-3.5" /> Message
                </Link>
              </div>

              {/* Owner Pending Cost Approval Decision Banner */}
              {activeJob.costApprovalRequest?.status === 'pending' && isOwner && (
                <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <span>Additional-Cost Authorization Required</span>
                    </div>
                    <span className="badge-yellow">Action Needed</span>
                  </div>

                  <p className="text-xs text-amber-900 leading-relaxed">
                    The technician encountered hidden issues during disassembly: <strong>{activeJob.costApprovalRequest.newlyDiscoveredIssue}</strong>.
                  </p>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1.5">
                    <div className="flex justify-between text-gray-600">
                      <span>Original Accepted Cost:</span>
                      <span>৳{activeJob.costApprovalRequest.originalTotal?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Additional Parts & Labor:</span>
                      <span>+৳{((activeJob.costApprovalRequest.additionalParts || 0) + (activeJob.costApprovalRequest.additionalLabor || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-950 font-bold text-sm pt-1 border-t border-gray-100">
                      <span>New Total Cost:</span>
                      <span className="text-primary-700">৳{activeJob.costApprovalRequest.revisedTotal?.toLocaleString()}</span>
                    </div>
                    {activeJob.costApprovalRequest.explanation && (
                      <p className="text-[11px] text-gray-500 italic pt-1">
                        Note: {activeJob.costApprovalRequest.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => {
                        const note = window.prompt('Reason for declining (optional):');
                        api.post(`/repair-jobs/${activeJob._id}/cost-approval/decision`, { decision: 'rejected', note })
                          .then(() => {
                            queryClient.invalidateQueries(['repair-request', id]);
                            queryClient.invalidateQueries(['repair-jobs', id]);
                            toast.info('Cost revision declined.');
                          });
                      }}
                      className="btn-outline btn-sm text-gray-700 bg-white"
                    >
                      Decline Revision
                    </button>
                    <button
                      onClick={() => {
                        api.post(`/repair-jobs/${activeJob._id}/cost-approval/decision`, { decision: 'approved' })
                          .then(() => {
                            queryClient.invalidateQueries(['repair-request', id]);
                            queryClient.invalidateQueries(['repair-jobs', id]);
                            toast.success('Revised cost approved!');
                          });
                      }}
                      className="btn-primary btn-sm flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Approve Revised Total (৳{activeJob.costApprovalRequest.revisedTotal?.toLocaleString()})
                    </button>
                  </div>
                </div>
              )}

              {/* Handover Ready Alert */}
              {activeJob.currentStatus === 'ready_for_collection' && isOwner && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                    <span>Item Ready for Handover!</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    The technician has completed repairs and quality testing. Please inspect your item and confirm completion to activate your warranty.
                  </p>
                  <button
                    onClick={() => confirmCompletionMutation.mutate()}
                    disabled={confirmCompletionMutation.isPending}
                    className="btn-primary btn-sm w-full mt-2 flex items-center justify-center gap-2"
                  >
                    {confirmCompletionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                    Confirm Handover & Activate Digital Warranty
                  </button>
                </div>
              )}

              {/* Completed Status Summary */}
              {activeJob.currentStatus === 'completed' && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                      <Award className="w-5 h-5 text-emerald-600" />
                      <span>Repair Successfully Completed</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(activeJob.completedAt || activeJob.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {activeWarranty && (
                    <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-800 block">Digital Warranty Active</span>
                        <span className="text-gray-500">Valid until {new Date(activeWarranty.endDate).toLocaleDateString()}</span>
                      </div>
                      <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                  )}
                  {isOwner && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setShowReviewModal(true)} className="btn-primary btn-sm flex-1 text-xs">
                        <Star className="w-3.5 h-3.5" /> Leave 5-Star Review
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Sticky Real-time Conversation Window (Desktop ≥ 1280px) */}
        {/* ========================================================================= */}
        <div className="hidden xl:block sticky top-20 w-full min-w-[360px] max-w-[440px]">
          {showConversation ? (
            <RepairConversation
              repairRequestId={id}
              showBackButton={false}
              isFullScreen={false}
              customHeight="calc(100dvh - 120px)"
            />
          ) : (
            <div className="card card-body text-center py-12 bg-gray-50/70 border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-800 text-sm">Chat Locked in Draft Stage</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Direct technician messaging unlocks once you publish your request and invite specialists.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PRE-PUBLISH REVIEW & COMPLETION CHECKLIST */}
      {/* ========================================================================= */}
      {showPrePublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-primary-50/50">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-gray-900 text-base">Pre-Publication Review</h3>
              </div>
              <button
                onClick={() => setShowPrePublishModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <p className="text-gray-600 text-sm">
                Please review the information technicians will see before making this request live.
              </p>

              {/* Summary Checklist */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Completion Checklist</h4>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Item: <strong>{rr?.item?.title}</strong> ({rr?.item?.category?.name})</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Problem Description: <strong>{rr?.problemDescription?.substring(0, 70)}...</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Safety Screening: <strong>{rr?.safetyFlags?.length ? `${rr.safetyFlags.length} flags attached` : 'Passed cleanly'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Budget Range: <strong>{rr?.budgetMinimum ? `৳${rr.budgetMinimum}–৳${rr.budgetMaximum}` : 'Flexible'}</strong></span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
                <strong>What happens next?</strong> Once published, your request becomes discoverable to certified technicians. You can also directly invite specialists.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50">
              <button onClick={() => setShowPrePublishModal(false)} className="btn-outline btn-sm">
                Back to Edit
              </button>
              <button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-2"
              >
                {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Confirm & Publish Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM QUOTATION ACCEPTANCE & TECHNICIAN ASSIGNMENT */}
      {/* ========================================================================= */}
      {selectedQuoteForAccept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-primary-700 font-bold text-base">
              <CheckCircle className="w-5 h-5" />
              <span>Assign Technician & Accept Proposal</span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              You are assigning <strong>{selectedQuoteForAccept.technician?.fullName}</strong> to perform and complete this repair work.
            </p>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Labor Estimate:</span>
                <span className="font-bold text-gray-900">৳{selectedQuoteForAccept.laborCostMinimum}–৳{selectedQuoteForAccept.laborCostMaximum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Duration:</span>
                <span className="font-bold text-gray-900">{selectedQuoteForAccept.expectedDuration?.value} {selectedQuoteForAccept.expectedDuration?.unit || 'days'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Warranty Coverage:</span>
                <span className="font-bold text-emerald-700">{selectedQuoteForAccept.warrantyDays || 30} Days</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              * Competing quotations will be automatically closed. An active repair job will be generated immediately.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setSelectedQuoteForAccept(null)} className="btn-outline btn-sm">
                Cancel
              </button>
              <button
                onClick={() => acceptQuotationMutation.mutate(selectedQuoteForAccept._id)}
                disabled={acceptQuotationMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5 font-bold"
              >
                {acceptQuotationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm & Assign Technician
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LEAVE REVIEW & RATING */}
      {/* ========================================================================= */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-primary-700 font-bold text-base">
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                <span>Review Technician Workmanship</span>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="label">Overall Star Rating</label>
                <div className="flex gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-110"
                    >
                      {star <= reviewRating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Written Review</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  className="input resize-y text-sm"
                  placeholder="Share details of your experience: repair quality, timeliness, communication..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button onClick={() => setShowReviewModal(false)} className="btn-outline btn-sm">
                Cancel
              </button>
              <button
                onClick={() =>
                  submitReviewMutation.mutate({
                    rating: reviewRating,
                    reviewText,
                    communicationRating,
                    serviceQualityRating,
                    valueRating,
                  })
                }
                disabled={submitReviewMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                {submitReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: OPEN DISPUTE */}
      {/* ========================================================================= */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-danger-700 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Open Dispute Mediation</span>
              </div>
              <button onClick={() => setShowDisputeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Dispute Category</label>
                <select
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value)}
                  className="input text-xs"
                >
                  <option value="quality">Repair Quality Issue</option>
                  <option value="cost">Unexpected Cost Revision</option>
                  <option value="timeline">Turnaround Delay</option>
                  <option value="damage">Device Damage</option>
                  <option value="warranty">Warranty Claim Rejected</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Reason / Problem Description</label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                  className="input resize-y text-xs"
                  placeholder="Explain the conflict clearly..."
                />
              </div>

              <div>
                <label className="label">Desired Resolution</label>
                <input
                  value={disputeDesiredResolution}
                  onChange={(e) => setDisputeDesiredResolution(e.target.value)}
                  className="input text-xs"
                  placeholder="e.g. Free rework, full refund, warranty extension..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button onClick={() => setShowDisputeModal(false)} className="btn-outline btn-sm">
                Cancel
              </button>
              <button
                onClick={() =>
                  submitDisputeMutation.mutate({
                    category: disputeCategory,
                    description: disputeReason,
                    desiredResolution: disputeDesiredResolution,
                  })
                }
                disabled={!disputeReason.trim() || submitDisputeMutation.isPending}
                className="btn-danger btn-sm flex items-center gap-1.5"
              >
                {submitDisputeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TECHNICIAN WORKSPACE MODALS */}
      {/* ========================================================================= */}
      {showQuotationModal && (
        <QuotationBuilderModal
          open={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          repairRequest={rr}
        />
      )}

      {showInspectionModal && activeJob && (
        <InspectionReportModal
          open={showInspectionModal}
          onClose={() => setShowInspectionModal(false)}
          repairJob={activeJob}
        />
      )}

      {showCostApprovalModal && activeJob && (
        <CostApprovalModal
          open={showCostApprovalModal}
          onClose={() => setShowCostApprovalModal(false)}
          repairJob={activeJob}
        />
      )}

      {showPartsModal && activeJob && (
        <PartsTrackerModal
          open={showPartsModal}
          onClose={() => setShowPartsModal(false)}
          repairJob={activeJob}
        />
      )}

      {showQualityCheckModal && activeJob && (
        <QualityCheckModal
          open={showQualityCheckModal}
          onClose={() => setShowQualityCheckModal(false)}
          repairJob={activeJob}
        />
      )}

      {showAssignModal && (
        <AssignTechnicianModal
          open={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          repairRequest={rr}
          quotations={quotations}
        />
      )}
    </div>
  );
}

