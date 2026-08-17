import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState, StatusBadge, Pagination } from '../../components/ui';
import { ClipboardList, Plus, Search, Filter, Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RepairRequestsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['repair-requests', page, statusFilter, search],
    queryFn: () => api.get(`/repair-requests?page=${page}&limit=12${statusFilter ? `&status=${statusFilter}` : ''}${search ? `&search=${search}` : ''}`).then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const statuses = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'awaiting_quotations', label: 'Awaiting Quotes' },
    { value: 'quotation_accepted', label: 'Accepted' },
    { value: 'repair_in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.role === 'technician' ? 'Available repair requests and your active jobs' : 'Track all your repair requests'}</p>
        </div>
        {user?.role === 'owner' && (
          <Link to="/items/new" className="btn-primary"><Plus className="w-4 h-4" /> New Request</Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
            placeholder="Search requests..."
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setPage(1); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                statusFilter === s.value
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {data?.repairRequests?.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No repair requests"
          description={user?.role === 'owner' ? 'Create a repair request to get started.' : 'No matching requests found.'}
          action={user?.role === 'owner' && <Link to="/items/new" className="btn-primary"><Plus className="w-4 h-4" /> Create Request</Link>} />
      ) : (
        <>
          <div className="space-y-3">
            {data?.repairRequests?.map((rr) => (
              <Link key={rr._id} to={`/repair-requests/${rr._id}`}
                className="card flex items-center gap-5 p-5 hover:shadow-md transition-shadow group">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                  {rr.item?.images?.length > 0 ? (
                    <img src={rr.item.images[0].url} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <ClipboardList className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{rr.item?.title || 'Repair Request'}</h3>
                    <StatusBadge status={rr.requestStatus} />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{rr.problemDescription?.substring(0, 120)}...</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(rr.createdAt).toLocaleDateString()}</span>
                    {rr.owner?.fullName && <span>by {rr.owner.fullName}</span>}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
