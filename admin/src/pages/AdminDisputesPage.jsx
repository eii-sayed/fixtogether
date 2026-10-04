import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { PageLoader, ErrorState, EmptyState } from '../components/ui';
import {
  MessageSquare,
  Shield,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  HelpCircle,
  FileText,
  DollarSign,
  Calendar,
  Wrench,
  Scale,
  XCircle,
} from 'lucide-react';
import { DISPUTE_RESOLUTIONS } from '../utils/adminStatusConfig';

export default function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const [selectedDisputeId, setSelectedDisputeId] = useState(null);
  const [resolutionModal, setResolutionModal] = useState(null); // dispute
  const [decision, setDecision] = useState('full_resolution');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [internalFindings, setInternalFindings] = useState('');
  const [missingInfoModal, setMissingInfoModal] = useState(null);
  const [missingInfoText, setMissingInfoText] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Disputes List
  const { data: disputesData, isLoading, error } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => api.get('/admin/disputes').then((r) => r.data.data),
  });

  const disputes = disputesData?.disputes || [];

  // 2. Fetch Selected Dispute Details & Evidence
  const { data: selectedDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['admin-dispute-details', selectedDisputeId],
    queryFn: () => api.get(`/admin/disputes/${selectedDisputeId}`).then((r) => r.data.data?.dispute),
    enabled: !!selectedDisputeId,
  });

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: ({ id, decision, notes, internalFindings, expectedVersion }) =>
      api.patch(`/admin/disputes/${id}/resolve`, {
        decision,
        notes,
        internalFindings,
        expectedVersion,
      }),
    onSuccess: () => {
      setResolutionModal(null);
      setResolutionNotes('');
      setInternalFindings('');
      queryClient.invalidateQueries(['admin-disputes']);
      queryClient.invalidateQueries(['admin-dispute-details', selectedDisputeId]);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Resolution failed.'),
  });

  // Missing info request mutation
  const missingInfoMutation = useMutation({
    mutationFn: ({ id, targetUserId, requestText }) =>
      api.post(`/admin/disputes/${id}/missing-info`, { targetUserId, requestText }),
    onSuccess: () => {
      setMissingInfoModal(null);
      setMissingInfoText('');
      queryClient.invalidateQueries(['admin-dispute-details', selectedDisputeId]);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Failed to request info.'),
  });

  // Internal Note Mutation
  const noteMutation = useMutation({
    mutationFn: ({ id, note }) => api.post(`/admin/disputes/${id}/notes`, { note }),
    onSuccess: () => {
      setInternalNote('');
      queryClient.invalidateQueries(['admin-dispute-details', selectedDisputeId]);
    },
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const activeDispute = selectedDetails || (disputes.length > 0 ? disputes[0] : null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Dispute Case Management Workspace
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Formal Arbitration
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Review immutable repair evidence, party statements, request missing information, and render binding resolutions.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 text-red-300 text-xs rounded-xl border border-red-500/30 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-bold underline ml-3 text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace: Case Selector (4 cols) & Evidence Timeline (8 cols) */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Dispute Cases List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="card p-3 bg-gray-900 border-gray-800">
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider px-2 py-1">
              Active Cases ({disputes.length})
            </h2>
            <div className="divide-y divide-gray-800 mt-2">
              {disputes.length > 0 ? (
                disputes.map((d) => {
                  const isSelected =
                    (selectedDisputeId && selectedDisputeId === d._id) ||
                    (!selectedDisputeId && activeDispute?._id === d._id);

                  return (
                    <button
                      key={d._id}
                      onClick={() => setSelectedDisputeId(d._id)}
                      className={`w-full text-left p-3 rounded-xl transition-all block ${
                        isSelected
                          ? 'bg-purple-950/40 border border-purple-500/30 shadow-xs'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {d.category || 'Dispute'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            d.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-white mt-1.5 line-clamp-1">
                        {d.reason || 'Case Arbitration'}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {d.openedBy?.fullName || 'Owner'} vs {d.againstUser?.fullName || 'Technician'}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-gray-500">
                  No dispute cases filed.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Consolidated Evidence Timeline & Resolution Controls */}
        <div className="lg:col-span-8 space-y-6">
          {activeDispute ? (
            <div className="space-y-6">
              {/* Case Header Card */}
              <div className="card p-5 space-y-4 bg-gray-900 border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-purple-400" />
                      <h2 className="text-base font-bold text-white">
                        Dispute #{activeDispute._id?.slice(-8).toUpperCase()}
                      </h2>
                      <span className="badge-gray text-[10px] uppercase">
                        {activeDispute.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Opened by <strong className="text-gray-200">{activeDispute.openedBy?.fullName}</strong> against{' '}
                      <strong className="text-gray-200">{activeDispute.againstUser?.fullName}</strong> on{' '}
                      {new Date(activeDispute.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {activeDispute.status !== 'resolved' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setMissingInfoModal(activeDispute);
                          setTargetUserId(activeDispute.againstUser?._id || '');
                        }}
                        className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Request Info
                      </button>
                      <button
                        onClick={() => setResolutionModal(activeDispute)}
                        className="btn-primary py-1.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Render Decision
                      </button>
                    </div>
                  )}
                </div>

                {/* Dispute Reason & Claims */}
                <div className="bg-gray-950/70 border border-gray-800/80 p-4 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-gray-300">Formal Claim Statement:</span>
                  <p className="text-gray-300">{activeDispute.reason}</p>
                  {activeDispute.description && (
                    <p className="text-gray-400 mt-2">{activeDispute.description}</p>
                  )}
                </div>

                {/* Decision Result (if resolved) */}
                {activeDispute.status === 'resolved' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Binding Decision Rendered
                      </span>
                      <span>{new Date(activeDispute.resolvedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-emerald-300 font-medium">
                      Decision: {activeDispute.resolution?.decision?.toUpperCase()}
                    </p>
                    <p className="text-emerald-400">
                      Public Explanation: {activeDispute.resolution?.notes}
                    </p>
                    {activeDispute.resolution?.internalFindings && (
                      <p className="text-emerald-500 text-[11px]">
                        Internal Findings: {activeDispute.resolution?.internalFindings}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Immutable Evidence Timeline Card */}
              <div className="card p-5 space-y-4 bg-gray-900 border-gray-800">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary-400" /> Consolidated Evidence Timeline
                </h3>

                <div className="space-y-4 text-xs">
                  {/* Statements and responses */}
                  <div className="space-y-2">
                    <span className="font-semibold text-gray-400">Party Submissions & Responses:</span>
                    {(activeDispute.responses || []).length > 0 ? (
                      activeDispute.responses.map((resp, i) => (
                        <div key={i} className="p-3 bg-gray-950/70 rounded-xl border border-gray-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                            <span className="text-gray-200">{resp.user?.fullName || 'Party'}</span>
                            <span>{new Date(resp.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-300">{resp.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No supplemental responses submitted yet.</p>
                    )}
                  </div>

                  {/* Missing Info Requests */}
                  {(activeDispute.missingInfoRequests || []).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      <span className="font-semibold text-blue-400">Administrator Information Inquiries:</span>
                      {activeDispute.missingInfoRequests.map((req, i) => (
                        <div key={i} className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-blue-400 font-semibold">
                            <span>Inquiry #{i + 1}</span>
                            <span>{new Date(req.requestedAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-gray-300">{req.requestText}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Internal Case Notes & Audit */}
              <div className="card p-5 space-y-3 bg-gray-900 border-gray-800">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary-400" /> Internal Arbitration Notes
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-gray-800">
                  {(activeDispute.internalNotes || []).length > 0 ? (
                    activeDispute.internalNotes.map((n, i) => (
                      <div key={i} className="pt-2 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span className="text-gray-300 font-medium">{n.admin?.fullName || 'Administrator'}</span>
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-400 mt-0.5">{n.note}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-xs text-gray-500">
                      No internal notes recorded.
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add an internal observation..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="input text-xs flex-1 bg-gray-950 border-gray-800 text-white"
                  />
                  <button
                    onClick={() =>
                      noteMutation.mutate({ id: activeDispute._id, note: internalNote })
                    }
                    disabled={!internalNote.trim() || noteMutation.isPending}
                    className="btn-primary py-1.5 px-3 text-xs"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No Dispute Selected"
              description="Select an active dispute from the list to review evidence and render arbitration."
              icon={Scale}
            />
          )}
        </div>
      </div>

      {/* Resolution Decision Modal */}
      {resolutionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Scale className="w-5 h-5 text-purple-400" /> Render Dispute Arbitration Decision
              </h3>
              <button onClick={() => setResolutionModal(null)} className="text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Resolution Type Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Binding Resolution Option <span className="text-red-500">*</span>
              </label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="input text-xs w-full bg-gray-950 border-gray-800 text-white"
              >
                {Object.entries(DISPUTE_RESOLUTIONS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                {DISPUTE_RESOLUTIONS[decision]?.desc}
              </p>
            </div>

            {/* User-facing explanation */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Public Decision Explanation (Delivered to both parties) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the factual basis and findings for this binding decision..."
                className="input text-xs w-full bg-gray-950 border-gray-800 text-white"
              />
            </div>

            {/* Internal Findings */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Internal Administrative Findings (Privileged audit record)
              </label>
              <textarea
                rows={2}
                value={internalFindings}
                onChange={(e) => setInternalFindings(e.target.value)}
                placeholder="Notes on policy alignment, warranty validity, technician track record..."
                className="input text-xs w-full bg-gray-950 border-gray-800 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <button onClick={() => setResolutionModal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  resolveMutation.mutate({
                    id: resolutionModal._id,
                    decision,
                    notes: resolutionNotes,
                    internalFindings,
                    expectedVersion: resolutionModal.version,
                  })
                }
                disabled={!resolutionNotes.trim() || resolveMutation.isPending}
                className="btn-primary text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                Finalize & Issue Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Info Modal */}
      {missingInfoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Request Missing Information</h3>
            <p className="text-xs text-gray-400">
              Ask for additional photographs, receipts, or technical clarification from a party.
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Target Party</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="input text-xs w-full bg-gray-950 border-gray-800 text-white"
              >
                <option value={missingInfoModal.openedBy?._id}>
                  {missingInfoModal.openedBy?.fullName} (Initiator)
                </option>
                <option value={missingInfoModal.againstUser?._id}>
                  {missingInfoModal.againstUser?.fullName} (Opposing Party)
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Inquiry Details</label>
              <textarea
                rows={3}
                value={missingInfoText}
                onChange={(e) => setMissingInfoText(e.target.value)}
                placeholder="Please upload clear photos of the disassembled power supply..."
                className="input text-xs w-full bg-gray-950 border-gray-800 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setMissingInfoModal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  missingInfoMutation.mutate({
                    id: missingInfoModal._id,
                    targetUserId,
                    requestText: missingInfoText,
                  })
                }
                disabled={!missingInfoText.trim() || missingInfoMutation.isPending}
                className="btn-primary text-xs"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
