import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, FileUp, ShieldAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';

const STATUS_COPY = {
  not_submitted: 'Upload your verification documents to apply for administrator approval.',
  pending: 'Your documents are with the FixTogether administration team for review.',
  more_info_needed: 'The review team requested more information. Upload updated documents and resubmit.',
  rejected: 'Your verification application was not approved. Review the feedback before submitting again.',
  approved: 'Your professional account is approved and can use all operational features.',
};

const DOCUMENT_TYPES = {
  technician: ['government_id', 'trade_certificate', 'professional_license', 'workshop_proof'],
  organization: ['legal_registration', 'tax_certificate', 'authorized_representative_id', 'operating_license'],
};

export default function VerificationSubmissionCard({ role, profile }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[role][0]);
  const status = profile?.verificationStatus || 'not_submitted';
  const isApproved = status === 'approved';
  const isPending = status === 'pending';
  const endpoint = role === 'technician'
    ? '/technicians/me/verification'
    : '/organizations/me/verification';

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      files.forEach((file) => formData.append('documents', file));
      if (role === 'organization') formData.append('documentType', documentType);
      return api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      ['my-profile', 'technician-workspace', 'org-workspace', 'org-workspace-profile', 'my-technician-profile', 'my-org-profile']
        .forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success('Verification documents submitted for administrator review.');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not submit verification documents.'),
  });

  const selectFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    if (selected.length > 5) {
      toast.error('Upload at most five documents at a time.');
      return;
    }
    if (selected.some((file) => file.size > 10 * 1024 * 1024)) {
      toast.error('Each document must be 10 MB or smaller.');
      return;
    }
    setFiles(selected);
  };

  const statusIcon = isApproved
    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
    : isPending
      ? <Clock3 className="w-5 h-5 text-amber-600" />
      : <ShieldAlert className="w-5 h-5 text-amber-700" />;

  return (
    <section className="card border border-amber-200 bg-amber-50/50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        {statusIcon}
        <div>
          <h2 className="text-sm font-bold text-gray-900">Professional verification</h2>
          <p className="text-xs text-gray-700 mt-1">{STATUS_COPY[status] || STATUS_COPY.not_submitted}</p>
          {profile?.verificationNote && !isApproved && (
            <p className="text-xs text-amber-900 mt-2 rounded-lg border border-amber-200 bg-white/70 p-2">
              <strong>Admin feedback:</strong> {profile.verificationNote}
            </p>
          )}
        </div>
      </div>

      {!isApproved && (
        <>
          <div className="text-xs text-gray-700 rounded-lg bg-white/80 border border-amber-100 p-3">
            Accepted formats: PDF, JPEG, PNG, or WebP. Upload clear, legitimate records only; documents are reviewed by authorized administrators.
          </div>
          {!isPending && (
            <div className="space-y-3">
              {role === 'organization' && (
                <label className="block text-xs font-semibold text-gray-700">
                  Document type
                  <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="input mt-1 w-full">
                    {DOCUMENT_TYPES.organization.map((type) => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-xs font-semibold text-gray-700">
                Verification documents
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={selectFiles}
                  className="block w-full mt-1 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:font-semibold file:text-primary-700 hover:file:bg-primary-200"
                />
              </label>
              {files.length > 0 && (
                <ul className="text-xs text-gray-700 space-y-1">
                  {files.map((file) => <li key={`${file.name}-${file.lastModified}`}>• {file.name}</li>)}
                </ul>
              )}
              <button
                type="button"
                disabled={files.length === 0 || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
                className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitMutation.isPending ? <Upload className="w-3.5 h-3.5 animate-pulse" /> : <FileUp className="w-3.5 h-3.5" />}
                Submit for review
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
