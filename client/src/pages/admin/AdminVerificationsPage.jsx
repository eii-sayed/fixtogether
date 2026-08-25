import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui';
import { toast } from 'sonner';
import {
  Shield,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Building,
  FileText,
  AlertTriangle,
  HelpCircle,
  Eye,
  CheckSquare,
  Square,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminVerificationsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('technicians'); // 'technicians' | 'organizations'
  const queryClient = useQueryClient();

  const [decisionModal, setDecisionModal] = useState(null); // { applicant, type, targetStatus }
  const [decisionReason, setDecisionReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [checklist, setChecklist] = useState({
    identityVerified: false,
    credentialsChecked: false,
    documentsValid: false,
    standardsAcknowledged: false,
  });

  const { data: techData, isLoading: techLoading, error: techError } = useQuery({
    queryKey: ['pending-techs'],
    queryFn: () => api.get('/admin/technicians/pending').then((r) => r.data.data),
    enabled: tab === 'technicians',
  });

  const { data: orgData, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['pending-orgs'],
    queryFn: () => api.get('/admin/organizations/pending').then((r) => r.data.data),
    enabled: tab === 'organizations',
  });

  const techMutation = useMutation({
    mutationFn: ({ id, status, reason, note }) =>
      api.patch(`/admin/technicians/${id}/verification`, {
        verificationStatus: status,
        rejectionReason: reason,
        adminNote: note,
      }),
    onSuccess: () => {
      setDecisionModal(null);
      setDecisionReason('');
      setAdminNote('');
      queryClient.invalidateQueries(['pending-techs']);
      toast.success('Technician verification updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Verification update failed'),
  });

  const orgMutation = useMutation({
    mutationFn: ({ id, status, reason, note }) =>
      api.patch(`/admin/organizations/${id}/verification`, {
        verificationStatus: status,
        rejectionReason: reason,
        adminNote: note,
      }),
    onSuccess: () => {
      setDecisionModal(null);
      setDecisionReason('');
      setAdminNote('');
      queryClient.invalidateQueries(['pending-orgs']);
      toast.success('Organization verification updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Verification update failed'),
  });

  const isLoading = tab === 'technicians' ? techLoading : orgLoading;
  const isError = tab === 'technicians' ? techError : orgError;

  const handleOpenDecision = (applicant, type, targetStatus) => {
    // Self-approval safeguard
    const applicantUserId = applicant.user?._id || applicant.user;
    if (applicantUserId === user?.userId) {
      toast.error('Security Safeguard: You cannot approve or modify your own verification application.');
      return;
    }

    setDecisionModal({ applicant, type, targetStatus });
    setDecisionReason('');
    setAdminNote('');
    setChecklist({
      identityVerified: false,
      credentialsChecked: false,
      documentsValid: false,
      standardsAcknowledged: false,
    });
  };

  const isChecklistComplete =
    decisionModal?.targetStatus !== 'approved' ||
    (checklist.identityVerified && checklist.credentialsChecked && checklist.documentsValid);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Credential & Identity Verification Workspace
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              Compliance Review
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review submitted government IDs, trade certifications, repair credentials, and non-profit organization documentation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('technicians')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            tab === 'technicians'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <User className="w-4 h-4" /> Technician Applicants ({techData?.technicians?.length || 0})
        </button>
        <button
          onClick={() => setTab('organizations')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            tab === 'organizations'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building className="w-4 h-4" /> Organization Applicants ({orgData?.organizations?.length || 0})
        </button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState error={isError} />
      ) : (
        <div className="space-y-4">
          {tab === 'technicians' && (
            <div className="space-y-4">
              {techData?.technicians?.length === 0 ? (
                <EmptyState
                  title="No Pending Technician Applications"
                  description="All submitted technician credentials have been reviewed and finalized."
                  icon={Shield}
                />
              ) : (
                techData?.technicians?.map((t) => {
                  const isSelf = (t.user?._id || t.user) === user?.userId;
                  return (
                    <div key={t._id} className="card p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 font-bold text-base">
                            {t.user?.fullName?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-gray-900">{t.user?.fullName}</h3>
                              {isSelf && (
                                <span className="badge-gray text-[10px] bg-red-50 text-red-700">
                                  Your Account (Self-approval locked)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{t.user?.email}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Joined: {new Date(t.user?.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Decision Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDecision(t, 'technician', 'more_info_needed')}
                            disabled={isSelf}
                            className="btn-outline py-1.5 px-3 text-xs"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> Request Info
                          </button>
                          <button
                            onClick={() => handleOpenDecision(t, 'technician', 'rejected')}
                            disabled={isSelf}
                            className="btn-danger py-1.5 px-3 text-xs"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => handleOpenDecision(t, 'technician', 'approved')}
                            disabled={isSelf}
                            className="btn-primary py-1.5 px-3 text-xs shadow-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                        </div>
                      </div>

                      {/* Technical Credentials & Experience */}
                      <div className="grid sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-gray-500 block text-[11px]">Experience & Bio:</span>
                          <span className="font-bold text-gray-800">
                            {t.yearsOfExperience || 0} Years Field Practice
                          </span>
                          <p className="text-gray-600 mt-1 line-clamp-2">{t.biography || 'No bio provided'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-gray-500 block text-[11px]">Claimed Skills:</span>
                          <span className="font-bold text-gray-800">
                            {t.skills?.length || 0} Specializations
                          </span>
                          <p className="text-gray-600 mt-1">
                            {t.skills?.map((s) => s.name || s).join(', ') || 'General repairs'}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-gray-500 block text-[11px]">Uploaded Credentials:</span>
                          <span className="font-bold text-gray-800">
                            {t.verificationDocuments?.length || 0} Documents Attached
                          </span>
                          <div className="mt-1 space-y-1">
                            {t.verificationDocuments?.map((doc, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
                                <span className="truncate">{doc.type || 'Certification'}</span>
                                {doc.fileUrl && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary-600 hover:underline font-semibold"
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'organizations' && (
            <div className="space-y-4">
              {orgData?.organizations?.length === 0 ? (
                <EmptyState
                  title="No Pending Organization Applications"
                  description="All community partners and non-profit hubs have been processed."
                  icon={Building}
                />
              ) : (
                orgData?.organizations?.map((o) => (
                  <div key={o._id} className="card p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-base">
                          <Building className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">
                            {o.organizationName || o.user?.fullName}
                          </h3>
                          <p className="text-xs text-gray-500">{o.user?.email}</p>
                          <span className="badge-blue capitalize mt-1 inline-block text-[10px]">
                            {o.organizationType?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDecision(o, 'organization', 'rejected')}
                          className="btn-danger py-1.5 px-3 text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => handleOpenDecision(o, 'organization', 'approved')}
                          className="btn-primary py-1.5 px-3 text-xs shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Decision Checklist & Confirmation Modal */}
      {decisionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">
              Confirm Verification Decision:{' '}
              <span className="capitalize font-mono text-primary-600">
                {decisionModal.targetStatus}
              </span>
            </h3>
            <p className="text-xs text-gray-600">
              Applicant: <strong>{decisionModal.applicant.user?.fullName || 'User'}</strong>
            </p>

            {/* Mandatory Checklist for Approval */}
            {decisionModal.targetStatus === 'approved' && (
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs space-y-2">
                <span className="font-bold text-amber-900 block">
                  Mandatory Pre-Approval Checklist:
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.identityVerified}
                    onChange={(e) =>
                      setChecklist((c) => ({ ...c, identityVerified: e.target.checked }))
                    }
                    className="rounded text-primary-600"
                  />
                  <span>Applicant identity and national ID inspected</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.credentialsChecked}
                    onChange={(e) =>
                      setChecklist((c) => ({ ...c, credentialsChecked: e.target.checked }))
                    }
                    className="rounded text-primary-600"
                  />
                  <span>Technical certifications verified with issuer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.documentsValid}
                    onChange={(e) =>
                      setChecklist((c) => ({ ...c, documentsValid: e.target.checked }))
                    }
                    className="rounded text-primary-600"
                  />
                  <span>Documents unexpired and clearly legible</span>
                </label>
              </div>
            )}

            {decisionModal.targetStatus === 'rejected' && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Rejection Reason (Delivered to applicant) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Expired certification / blurry ID / missing workshop permit..."
                  className="input text-xs w-full"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Internal Administrative Note
              </label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reviewed by Lead Admin on duty..."
                className="input text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setDecisionModal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() => {
                  const applicantUserId =
                    decisionModal.applicant.user?._id || decisionModal.applicant.user;
                  const payload = {
                    id: applicantUserId,
                    status: decisionModal.targetStatus,
                    reason: decisionReason,
                    note: adminNote,
                  };
                  if (decisionModal.type === 'technician') {
                    techMutation.mutate(payload);
                  } else {
                    orgMutation.mutate(payload);
                  }
                }}
                disabled={
                  !isChecklistComplete ||
                  (decisionModal.targetStatus === 'rejected' && !decisionReason.trim())
                }
                className="btn-primary text-xs font-semibold"
              >
                Confirm Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
