import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, ErrorState, StatusBadge } from '../../components/ui';
import { toast } from 'sonner';
import { ArrowLeft, Zap, Shield, AlertTriangle, Send, Eye, CheckCircle, XCircle, Users, Star, Calendar, DollarSign, MessageCircle } from 'lucide-react';
import ChatPanel from '../../components/chat/ChatPanel';

export default function RepairRequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['repair-request', id],
    queryFn: () => api.get(`/repair-requests/${id}`).then(r => r.data.data),
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
    onSuccess: () => { queryClient.invalidateQueries(['repair-request', id]); toast.success('Request published!'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to publish'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/repair-requests/${id}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries(['repair-request', id]); toast.success('Request cancelled'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const rr = data?.repairRequest;
  const isOwner = user?.userId === rr?.owner?._id || user?.role === 'admin';
  const analysis = rr?.aiAnalysis;

  return (
    <div className="page-container max-w-4xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{rr?.item?.title || 'Repair Request'}</h1>
            <StatusBadge status={rr?.requestStatus} />
          </div>
          <p className="text-sm text-gray-500">
            Created {new Date(rr?.createdAt).toLocaleDateString()} • ID: {rr?._id?.slice(-8)}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem Description */}
          <div className="card card-body">
            <h2 className="section-title">Problem Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{rr?.problemDescription}</p>
            {rr?.eventBeforeIssue && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Event before issue</p>
                <p className="text-sm text-gray-700">{rr.eventBeforeIssue}</p>
              </div>
            )}
            {rr?.previousRepairAttempts && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Previous repair attempts</p>
                <p className="text-sm text-gray-700">{rr.previousRepairAttempts}</p>
              </div>
            )}
          </div>

          {/* Safety Flags */}
          {rr?.safetyFlags?.length > 0 && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-danger-600" />
                <h3 className="font-semibold text-danger-800">Safety Warnings</h3>
              </div>
              {rr.safetyFlags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2 mt-2">
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
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900">AI Analysis</h2>
                <span className="badge-purple ml-auto">{analysis.confidence || 0}% confidence</span>
              </div>
              <div className="p-5 space-y-5">
                {/* Symptoms */}
                {analysis.extractedSymptoms?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Detected Symptoms</h4>
                    <div className="space-y-2">
                      {analysis.extractedSymptoms.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${s.severity === 'high' ? 'bg-red-500' : s.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
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
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Inspection Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.possibleInspectionAreas.map((area, i) => (
                        <span key={i} className="badge-blue">{area}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Skills */}
                {analysis.recommendedTechnicianSkills?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Technician Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.recommendedTechnicianSkills.map((skill, i) => (
                        <span key={i} className="badge-green">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pathways */}
                {analysis.suggestedPathways?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Suggested Pathways</h4>
                    {analysis.suggestedPathways.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-gray-800 capitalize">{p.pathway}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{p.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Clarification Questions */}
                {analysis.clarificationQuestions?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Clarification Questions</h4>
                    <ul className="space-y-1.5">
                      {analysis.clarificationQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-primary-500 font-medium shrink-0">{i + 1}.</span> {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quotations */}
          {['quotations_received', 'quotation_accepted', 'awaiting_quotations'].includes(rr?.requestStatus) && isOwner && (
            <QuotationsSection requestId={id} selectedQuotation={rr?.selectedQuotation} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          {isOwner && (
            <div className="card card-body space-y-3">
              <h3 className="font-semibold text-gray-900">Actions</h3>
              {rr?.requestStatus === 'draft' && (
                <>
                  <button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}
                    className="btn-secondary w-full">
                    <Zap className="w-4 h-4" /> {analyzeMutation.isPending ? 'Analyzing...' : 'Run AI Analysis'}
                  </button>
                  <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}
                    className="btn-primary w-full">
                    <Send className="w-4 h-4" /> Publish Request
                  </button>
                </>
              )}
              {rr?.requestStatus === 'awaiting_owner_review' && (
                <button onClick={() => publishMutation.mutate()} className="btn-primary w-full">
                  <Send className="w-4 h-4" /> Confirm & Publish
                </button>
              )}
              {rr?.requestStatus === 'published' && (
                <Link to={`/repair-requests/${id}/matches`} className="btn-primary w-full">
                  <Users className="w-4 h-4" /> View Matches
                </Link>
              )}
              {!['completed', 'cancelled'].includes(rr?.requestStatus) && (
                <button onClick={() => cancelMutation.mutate()} className="btn-ghost w-full text-danger-600">
                  <XCircle className="w-4 h-4" /> Cancel Request
                </button>
              )}
            </div>
          )}

          {/* Item Info */}
          <div className="card card-body">
            <h3 className="font-semibold text-gray-900 mb-3">Item Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="text-gray-900 font-medium">{rr?.item?.category?.name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Condition</dt>
                <dd><StatusBadge status={rr?.item?.condition} /></dd>
              </div>
              {rr?.budgetMinimum && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Budget</dt>
                  <dd className="text-gray-900 font-medium">৳{rr.budgetMinimum} – ৳{rr.budgetMaximum}</dd>
                </div>
              )}
              {rr?.preferredServiceMethod && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Service</dt>
                  <dd className="text-gray-900 font-medium capitalize">{rr.preferredServiceMethod}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Timeline */}
          <div className="card card-body">
            <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
            <div className="space-y-3">
              <TimelineItem label="Created" date={rr?.createdAt} />
              {rr?.publishedAt && <TimelineItem label="Published" date={rr.publishedAt} />}
            </div>
          </div>

          {/* Chat Panel */}
          {rr && !['draft', 'awaiting_ai_analysis'].includes(rr.requestStatus) && (
            <ChatPanel repairRequestId={id} />
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, date }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-2 h-2 rounded-full bg-primary-400" />
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-400 ml-auto text-xs">{new Date(date).toLocaleDateString()}</span>
    </div>
  );
}

function QuotationsSection({ requestId, selectedQuotation }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['quotations', requestId],
    queryFn: () => api.get(`/repair-requests/${requestId}/quotations`).then(r => r.data.data),
  });

  const acceptMutation = useMutation({
    mutationFn: (quotationId) => api.post(`/quotations/${quotationId}/accept`),
    onSuccess: () => { queryClient.invalidateQueries(['repair-request']); queryClient.invalidateQueries(['quotations']); toast.success('Quotation accepted!'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (!data?.quotations?.length) return null;

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Quotations ({data.quotations.length})</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {data.quotations.map((q) => (
          <div key={q._id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Link to={`/technicians/${q.technician?._id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-secondary-600" />
                </div>
                <span className="text-sm font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2">{q.technician?.fullName}</span>
              </Link>
              <StatusBadge status={q.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Labor</p>
                <p className="text-sm font-semibold text-gray-900">৳{q.laborCostMinimum}–{q.laborCostMaximum}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Parts</p>
                <p className="text-sm font-semibold text-gray-900">৳{q.partsEstimate}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-semibold text-gray-900">{q.expectedDuration?.value} {q.expectedDuration?.unit}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Warranty</p>
                <p className="text-sm font-semibold text-gray-900">{q.warrantyDays} days</p>
              </div>
            </div>
            {q.status === 'submitted' && !selectedQuotation && (
              <button onClick={() => acceptMutation.mutate(q._id)} className="btn-primary btn-sm w-full">
                Accept Quotation
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
