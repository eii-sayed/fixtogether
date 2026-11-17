import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { PageLoader, ErrorState, EmptyState } from '../components/ui';
import { toast } from 'sonner';
import {
  Shield,
  CheckCircle,
  XCircle,
  User,
  Building,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function ApplicantDocuments({ applicantUserId, professionalType, documents = [] }) {
  const [openingDocumentId, setOpeningDocumentId] = useState(null);

  const openDocument = async (documentId) => {
    setOpeningDocumentId(documentId);
    try {
      const basePath = professionalType === 'technician' ? 'technicians' : 'organizations';
      const { data } = await api.get(`/admin/${basePath}/${applicantUserId}/verification-documents/${documentId}`);
      window.open(data.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to open this verification document.');
    } finally {
      setOpeningDocumentId(null);
    }
  };

  return (
    <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl text-xs">
      <span className="text-gray-400 block text-[11px]">Submitted credentials:</span>
      <span className="font-bold text-gray-200">{documents.length} document{documents.length === 1 ? '' : 's'} attached</span>
      <div className="mt-2 space-y-1">
        {documents.length === 0 ? (
          <span className="text-amber-300 text-[11px]">No documents available — do not approve.</span>
        ) : documents.map((document, index) => (
          <div key={document._id || index} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate text-gray-300" title={document.originalName}>{document.type?.replace(/_/g, ' ') || 'Verification document'}</span>
            <button
              type="button"
              disabled={!document._id || openingDocumentId === document._id}
              onClick={() => openDocument(document._id)}
              className="shrink-0 text-primary-400 hover:underline font-semibold disabled:opacity-50"
            >
              {openingDocumentId === document._id ? 'Opening…' : 'View'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    mutationFn: ({ id, status, reason, note, approvalChecklist }) =>
      api.patch(`/admin/technicians/${id}/verification`, {
        verificationStatus: status,
        rejectionReason: reason,
        adminNote: note,
        approvalChecklist,
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
    mutationFn: ({ id, status, reason, note, approvalChecklist }) =>
      api.patch(`/admin/organizations/${id}/verification`, {
        verificationStatus: status,
        rejectionReason: reason,
        adminNote: note,
        approvalChecklist,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Credential & Identity Verification Workspace
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Compliance Review
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Review submitted government IDs, trade certifications, repair credentials, and non-profit organization documentation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setTab('technicians')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            tab === 'technicians'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          <User className="w-4 h-4" /> Technician Applicants ({techData?.technicians?.length || 0})
        </button>
        <button
          onClick={() => setTab('organizations')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            tab === 'organizations'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-gray-400 hover:bg-gray-800'
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
                    <div key={t._id} className="card p-5 space-y-4 bg-gray-900 border-gray-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center text-primary-400 font-bold text-base">
                            {t.user?.fullName?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{t.user?.fullName}</h3>
                              {isSelf && (
                                <span className="badge-gray text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                                  Your Account (Self-approval locked)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{t.user?.email}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
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
                            <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Request Info
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
                        <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl">
                          <span className="text-gray-400 block text-[11px]">Experience & Bio:</span>
                          <span className="font-bold text-gray-200">
                            {t.yearsOfExperience || 0} Years Field Practice
                          </span>
                          <p className="text-gray-400 mt-1 line-clamp-2">{t.biography || 'No bio provided'}</p>
                        </div>
                        <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl">
                          <span className="text-gray-400 block text-[11px]">Claimed Skills:</span>
                          <span className="font-bold text-gray-200">
                            {t.skills?.length || 0} Specializations
                          </span>
                          <p className="text-gray-400 mt-1">
                            {t.skills?.map((s) => s.name || s).join(', ') || 'General repairs'}
                          </p>
                        </div>
                        <ApplicantDocuments
                          applicantUserId={t.user?._id || t.user}
                          professionalType="technician"
                          documents={t.verificationDocuments}
                        />
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
                orgData?.organizations?.map((o) => {
                  const isSelf = (o.user?._id || o.user) === user?.userId;
                  return (
                  <div key={o._id} className="card p-5 space-y-4 bg-gray-900 border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-base">
                          <Building className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {o.organizationName || o.user?.fullName}
                          </h3>
                          {isSelf && <span className="text-[10px] text-red-400">Your Account (self-review locked)</span>}
                          <p className="text-xs text-gray-400">{o.user?.email}</p>
                          <span className="badge-blue capitalize mt-1 inline-block text-[10px]">
                            {o.organizationType?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDecision(o, 'organization', 'more_info_needed')}
                          disabled={isSelf}
                          className="btn-outline py-1.5 px-3 text-xs"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Request Info
                        </button>
                        <button
                          onClick={() => handleOpenDecision(o, 'organization', 'rejected')}
                          disabled={isSelf}
                          className="btn-danger py-1.5 px-3 text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => handleOpenDecision(o, 'organization', 'approved')}
                          disabled={isSelf}
                          className="btn-primary py-1.5 px-3 text-xs shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl text-xs">
                        <span className="text-gray-400 block text-[11px]">Registration details:</span>
                        <p className="text-gray-200 mt-1">{o.registrationInformation?.registrationNumber || 'No registration number provided'}</p>
                        <p className="text-gray-400 mt-1 truncate">{o.registrationInformation?.website || 'No website provided'}</p>
                      </div>
                      <ApplicantDocuments
                        applicantUserId={o.user?._id || o.user}
                        professionalType="organization"
                        documents={o.verificationDocuments}
                      />
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Decision Checklist & Confirmation Modal */}
      {decisionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Confirm Verification Decision:{' '}
              <span className="capitalize font-mono text-primary-400">
                {decisionModal.targetStatus}
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Applicant: <strong className="text-gray-200">{decisionModal.applicant.user?.fullName || 'User'}</strong>
            </p>

            {/* Mandatory Checklist for Approval */}
            {decisionModal.targetStatus === 'approved' && (
              <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/30 text-xs space-y-2 text-amber-200">
                <span className="font-bold text-amber-400 block">
                  Mandatory Pre-Approval Checklist:
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.identityVerified}
                    onChange={(e) =>
                      setChecklist((c) => ({ ...c, identityVerified: e.target.checked }))
                    }
                    className="rounded text-primary-600 bg-gray-950 border-gray-800"
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
                    className="rounded text-primary-600 bg-gray-950 border-gray-800"
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
                    className="rounded text-primary-600 bg-gray-950 border-gray-800"
                  />
                  <span>Documents unexpired and clearly legible</span>
                </label>
              </div>
            )}

            {['rejected', 'more_info_needed'].includes(decisionModal.targetStatus) && (
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  {decisionModal.targetStatus === 'rejected' ? 'Rejection Reason' : 'Information Requested'} (Delivered to applicant) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Expired certification / blurry ID / missing workshop permit..."
                  className="input text-xs w-full bg-gray-950 border-gray-800 text-gray-200"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Internal Administrative Note
              </label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reviewed by Lead Admin on duty..."
                className="input text-xs w-full bg-gray-950 border-gray-800 text-gray-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
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
                    approvalChecklist: {
                      identityVerified: checklist.identityVerified,
                      credentialsChecked: checklist.credentialsChecked,
                      documentsValid: checklist.documentsValid,
                    },
                  };
                  if (decisionModal.type === 'technician') {
                    techMutation.mutate(payload);
                  } else {
                    orgMutation.mutate(payload);
                  }
                }}
                disabled={
                  !isChecklistComplete ||
                  (['rejected', 'more_info_needed'].includes(decisionModal.targetStatus) && !decisionReason.trim())
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
