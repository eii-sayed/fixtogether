import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, StatusBadge, Pagination } from '../../components/ui';
import { toast } from 'sonner';
import { Shield, CheckCircle, XCircle, User, Calendar, Building } from 'lucide-react';

export default function AdminVerificationsPage() {
  const [tab, setTab] = useState('technicians');
  const queryClient = useQueryClient();

  const { data: techData, isLoading: techLoading } = useQuery({
    queryKey: ['pending-techs'],
    queryFn: () => api.get('/admin/technicians/pending').then(r => r.data.data),
    enabled: tab === 'technicians',
  });

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['pending-orgs'],
    queryFn: () => api.get('/admin/organizations/pending').then(r => r.data.data),
    enabled: tab === 'organizations',
  });

  const techMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/technicians/${id}/verification`, { verificationStatus: status }),
    onSuccess: () => { queryClient.invalidateQueries(['pending-techs']); toast.success('Verification updated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const orgMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/organizations/${id}/verification`, { verificationStatus: status }),
    onSuccess: () => { queryClient.invalidateQueries(['pending-orgs']); toast.success('Verification updated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const isLoading = tab === 'technicians' ? techLoading : orgLoading;

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verifications</h1>
        <p className="text-sm text-gray-500 mt-1">Review and approve technician and organization applications</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('technicians')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'technicians' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
          <User className="w-4 h-4 inline mr-1" /> Technicians
        </button>
        <button onClick={() => setTab('organizations')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'organizations' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
          <Building className="w-4 h-4 inline mr-1" /> Organizations
        </button>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="space-y-4">
          {tab === 'technicians' && (techData?.technicians?.length === 0 ? (
            <div className="card card-body text-center py-12 text-sm text-gray-500">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              No pending technician verifications
            </div>
          ) : techData?.technicians?.map((t) => (
            <div key={t._id} className="card card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-secondary-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{t.user?.fullName}</h3>
                    <p className="text-xs text-gray-500">{t.user?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(t.user?.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => techMutation.mutate({ id: t.user._id, status: 'approved' })}
                    className="btn-primary btn-sm"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                  <button onClick={() => techMutation.mutate({ id: t.user._id, status: 'rejected' })}
                    className="btn-danger btn-sm"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                </div>
              </div>
              {t.biography && <p className="mt-3 text-sm text-gray-600">{t.biography}</p>}
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span>Experience: {t.yearsOfExperience || 0} years</span>
                <span>Skills: {t.skills?.length || 0}</span>
                <span>Docs: {t.verificationDocuments?.length || 0}</span>
              </div>
            </div>
          )))}

          {tab === 'organizations' && (orgData?.organizations?.length === 0 ? (
            <div className="card card-body text-center py-12 text-sm text-gray-500">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              No pending organization verifications
            </div>
          ) : orgData?.organizations?.map((o) => (
            <div key={o._id} className="card card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{o.organizationName || o.user?.fullName}</h3>
                    <p className="text-xs text-gray-500">{o.user?.email}</p>
                    <span className="badge-blue capitalize mt-0.5">{o.organizationType?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => orgMutation.mutate({ id: o.user._id, status: 'approved' })}
                    className="btn-primary btn-sm"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                  <button onClick={() => orgMutation.mutate({ id: o.user._id, status: 'rejected' })}
                    className="btn-danger btn-sm"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                </div>
              </div>
            </div>
          )))}
        </div>
      )}
    </div>
  );
}
