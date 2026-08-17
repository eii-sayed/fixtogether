import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, ErrorState, StatusBadge } from '../../components/ui';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Zap,
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
} from 'lucide-react';
import RepairConversation from '../../components/chat/RepairConversation';

export default function RepairRequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['repair-request', id],
    queryFn: () => api.get(`/repair-requests/${id}`).then((r) => r.data.data),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => api.post(`/repair-requests/${id}/analyze`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['repair-request', id]);
      if (res.data.data.aiBlocked) {
        toast.warning('Safety concerns detected. AI advice restricted.');
      } else {
        toast.success('AI analysis complete!');
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Analysis failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/repair-requests/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      toast.success('Request published!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to publish'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/repair-requests/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      toast.success('Request cancelled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const rr = data?.repairRequest;
  const isOwner = user?.userId === rr?.owner?._id || user?.role === 'admin';
  const analysis = rr?.aiAnalysis;

  // Determine if conversation is accessible
  const showConversation =
    rr &&
    !['draft', 'awaiting_ai_analysis', 'awaiting_owner_review', 'awaiting_clarification'].includes(
      rr.requestStatus
    );

  return (
    <div className="page-container max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Main Repair Details & Workflow */}
        {/* ========================================================================= */}
        <div className="space-y-6 min-w-0">
          {/* Header */}
          <div className="card card-body">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {rr?.item?.title || 'Repair Request'}
                  </h1>
                  <StatusBadge status={rr?.requestStatus} />
                </div>
                <p className="text-xs text-gray-500">
                  Created {new Date(rr?.createdAt).toLocaleDateString()} • ID: {rr?._id?.slice(-8)}
                </p>
              </div>

              {/* Owner Action Buttons (Desktop inline header) */}
              {isOwner && rr?.requestStatus === 'draft' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => analyzeMutation.mutate()}
                    disabled={analyzeMutation.isPending}
                    className="btn-secondary btn-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {analyzeMutation.isPending ? 'Analyzing...' : 'AI Analysis'}
                  </button>
                  <button
                    onClick={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                    className="btn-primary btn-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> Publish
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile / Tablet Conversation Banner (< xl screens) */}
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
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <span>Message {isOwner ? 'Technician' : 'Item Owner'}</span>
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Open full-screen real-time conversation
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

          {/* Item Photos */}
          {rr?.item?.images?.length > 0 && (
            <div className="card card-body">
              <h2 className="section-title mb-3">Item Photos ({rr.item.images.length})</h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {rr.item.images.map((img, idx) => (
                  <a
                    key={idx}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden shrink-0 border border-gray-200 block shadow-xs hover:opacity-95 transition-opacity"
                    title="Click to view full size photo"
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
            </div>
          )}

          {/* Problem Description */}
          <div className="card card-body">
            <h2 className="section-title">Problem Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {rr?.problemDescription}
            </p>
            {rr?.eventBeforeIssue && (
              <div className="mt-4 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1">Event before issue</p>
                <p className="text-sm text-gray-700">{rr.eventBeforeIssue}</p>
              </div>
            )}
            {rr?.previousRepairAttempts && (
              <div className="mt-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1">Previous repair attempts</p>
                <p className="text-sm text-gray-700">{rr.previousRepairAttempts}</p>
              </div>
            )}
          </div>

          {/* Safety Flags */}
          {rr?.safetyFlags?.length > 0 && (
            <div className="bg-danger-50 border border-danger-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-danger-600" />
                <h3 className="font-bold text-danger-800 text-sm">Safety Warnings</h3>
              </div>
              {rr.safetyFlags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2.5 mt-2">
                  <Shield className="w-4 h-4 text-danger-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="badge-red mr-2">{flag.severity}</span>
                    <span className="text-sm text-danger-700">{flag.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Analysis */}
          {analysis && (
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-purple-50/50">
                <Zap className="w-5 h-5 text-purple-600" />
                <h2 className="font-bold text-gray-900 text-sm">AI Diagnosis & Safety Result</h2>
                <span className="badge-purple ml-auto">{analysis.confidence || 0}% confidence</span>
              </div>
              <div className="p-5 space-y-5">
                {/* Symptoms */}
                {analysis.extractedSymptoms?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Detected Symptoms
                    </h4>
                    <div className="space-y-2">
                      {analysis.extractedSymptoms.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              s.severity === 'high'
                                ? 'bg-red-500'
                                : s.severity === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                          />
                          <span className="text-gray-700">{s.description}</span>
                          <span className="text-xs text-gray-400">({s.severity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inspection Areas */}
                {analysis.possibleInspectionAreas?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Inspection Areas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.possibleInspectionAreas.map((area, i) => (
                        <span key={i} className="badge-blue">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Skills */}
                {analysis.recommendedTechnicianSkills?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Recommended Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.recommendedTechnicianSkills.map((skill, i) => (
                        <span key={i} className="badge-green">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quotations Workflow */}
          {['quotations_received', 'quotation_accepted', 'awaiting_quotations'].includes(
            rr?.requestStatus
          ) &&
            isOwner && (
              <QuotationsSection requestId={id} selectedQuotation={rr?.selectedQuotation} />
            )}

          {/* Item Details & Timeline in Main Column */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Item Info */}
            <div className="card card-body">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Item Details</h3>
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Category</dt>
                  <dd className="text-gray-900 font-semibold">{rr?.item?.category?.name || '—'}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">Condition</dt>
                  <dd>
                    <StatusBadge status={rr?.item?.condition} />
                  </dd>
                </div>
                {rr?.budgetMinimum ? (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Budget Range</dt>
                    <dd className="text-gray-900 font-semibold">
                      ৳{rr.budgetMinimum} – ৳{rr.budgetMaximum}
                    </dd>
                  </div>
                ) : null}
                {rr?.preferredServiceMethod ? (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Service Method</dt>
                    <dd className="text-gray-900 font-semibold capitalize">
                      {rr.preferredServiceMethod}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {/* Timeline */}
            <div className="card card-body">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Timeline</h3>
              <div className="space-y-2.5">
                <TimelineItem label="Request Created" date={rr?.createdAt} />
                {rr?.publishedAt && <TimelineItem label="Published" date={rr.publishedAt} />}
                {rr?.updatedAt && <TimelineItem label="Last Activity" date={rr.updatedAt} />}
              </div>
            </div>
          </div>

          {/* Actions & Workflow Navigation */}
          {isOwner && (
            <div className="card card-body">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Manage Request</h3>
              <div className="flex flex-wrap items-center gap-3">
                {rr?.requestStatus === 'published' && (
                  <Link to={`/repair-requests/${id}/matches`} className="btn-primary btn-sm">
                    <Users className="w-4 h-4" /> View Matched Technicians
                  </Link>
                )}
                {rr?.requestStatus === 'awaiting_owner_review' && (
                  <button onClick={() => publishMutation.mutate()} className="btn-primary btn-sm">
                    <Send className="w-4 h-4" /> Confirm & Publish
                  </button>
                )}
                {!['completed', 'cancelled'].includes(rr?.requestStatus) && (
                  <button
                    onClick={() => cancelMutation.mutate()}
                    className="btn-ghost btn-sm text-danger-600 hover:bg-danger-50 ml-auto"
                  >
                    <XCircle className="w-4 h-4" /> Cancel Request
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Sticky Dedicated Conversation Column (Desktop ≥ 1280px) */}
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
              <h4 className="font-bold text-gray-800 text-sm">Conversation Locked</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Direct messaging unlocks once technicians are invited, submit quotes, or are matched.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, date }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-400 ml-auto font-medium">
        {new Date(date).toLocaleDateString()}
      </span>
    </div>
  );
}

function QuotationsSection({ requestId, selectedQuotation }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['quotations', requestId],
    queryFn: () => api.get(`/repair-requests/${requestId}/quotations`).then((r) => r.data.data),
  });

  const acceptMutation = useMutation({
    mutationFn: (quotationId) => api.post(`/quotations/${quotationId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request']);
      queryClient.invalidateQueries(['quotations']);
      toast.success('Quotation accepted!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (!data?.quotations?.length) return null;

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-sm">Quotations ({data.quotations.length})</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {data.quotations.map((q) => (
          <div key={q._id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Link
                to={`/technicians/${q.technician?._id}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center font-bold text-secondary-700 text-xs">
                  <Star className="w-4 h-4 text-secondary-600" />
                </div>
                <span className="text-sm font-semibold text-primary-600 hover:text-primary-700 underline underline-offset-2">
                  {q.technician?.fullName}
                </span>
              </Link>
              <StatusBadge status={q.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="text-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Labor</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  ৳{q.laborCostMinimum}–{q.laborCostMaximum}
                </p>
              </div>
              <div className="text-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Parts</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">৳{q.partsEstimate}</p>
              </div>
              <div className="text-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Duration</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {q.expectedDuration?.value} {q.expectedDuration?.unit}
                </p>
              </div>
              <div className="text-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Warranty</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{q.warrantyDays} days</p>
              </div>
            </div>
            {q.status === 'submitted' && !selectedQuotation && (
              <button
                onClick={() => acceptMutation.mutate(q._id)}
                className="btn-primary btn-sm w-full"
              >
                Accept Quotation
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
