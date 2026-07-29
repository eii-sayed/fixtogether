import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState, StatusBadge, Pagination, ConfirmModal } from '../../components/ui';
import { toast } from 'sonner';
import { Package, Plus, Search, Trash2, Edit, Wrench, Clock } from 'lucide-react';

export default function ItemsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-items', page, search],
    queryFn: () => api.get(`/items?page=${page}&limit=12${search ? `&search=${search}` : ''}`).then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/items/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['my-items']); toast.success('Item removed'); setDeleteId(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const conditionColors = { new: 'badge-green', good: 'badge-green', fair: 'badge-yellow', poor: 'badge-yellow', broken: 'badge-red', for_parts: 'badge-gray' };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Items</h1>
          <p className="text-sm text-gray-500 mt-1">Items you've registered on the platform</p>
        </div>
        <Link to="/items/new" className="btn-primary"><Plus className="w-4 h-4" /> Add New Item</Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10" placeholder="Search items..." />
        </div>
      </div>

      {data?.items?.length === 0 ? (
        <EmptyState icon={Package} title="No items yet" description="Add your first item to get started with a repair request or donation."
          action={<Link to="/items/new" className="btn-primary"><Plus className="w-4 h-4" /> Add Item</Link>} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.items?.map((item) => (
              <div key={item._id} className="card hover:shadow-md transition-shadow group">
                {/* Image placeholder */}
                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  {item.images?.length > 0 ? (
                    <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-gray-300" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</h3>
                    <span className={conditionColors[item.condition] || 'badge-gray'}>{item.condition?.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    {item.brand && <span>{item.brand}</span>}
                    {item.category?.name && <span className="badge-blue">{item.category.name}</span>}
                  </div>
                  {item.approximateAge && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> {item.approximateAge.value} {item.approximateAge.unit} old
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <Link to={`/repair-requests/new?item=${item._id}`} className="btn-primary btn-sm flex-1">
                      <Wrench className="w-3.5 h-3.5" /> Request Repair
                    </Link>
                    <button onClick={() => setDeleteId(item._id)} className="btn-ghost btn-sm text-gray-400 hover:text-danger-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Remove Item" message="This will mark the item as removed. This action cannot be undone." confirmText="Remove" danger />
    </div>
  );
}
