import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, StatusBadge, Pagination } from '../../components/ui';
import { toast } from 'sonner';
import { Users, Search, Shield, Ban, CheckCircle, XCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, role, search],
    queryFn: () => api.get(`/admin/users?page=${page}&limit=20${role ? `&role=${role}` : ''}${search ? `&search=${search}` : ''}`).then(r => r.data.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, accountStatus }) => api.patch(`/admin/users/${id}/status`, { accountStatus }),
    onSuccess: () => { queryClient.invalidateQueries(['admin-users']); toast.success('User status updated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage platform users</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10" placeholder="Search users..." />
        </div>
        {['', 'owner', 'technician', 'organization', 'admin'].map((r) => (
          <button key={r} onClick={() => { setRole(r); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${role === r ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.users?.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="badge-blue capitalize">{u.role}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={u.accountStatus} /></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {u.accountStatus === 'active' ? (
                        <button onClick={() => statusMutation.mutate({ id: u._id, accountStatus: 'suspended' })}
                          className="btn-ghost btn-sm text-danger-600" title="Suspend">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => statusMutation.mutate({ id: u._id, accountStatus: 'active' })}
                          className="btn-ghost btn-sm text-green-600" title="Activate">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
