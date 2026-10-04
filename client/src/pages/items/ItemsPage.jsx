import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState, Pagination, ConfirmModal } from '../../components/ui';
import QuickAddItemModal from '../../components/items/QuickAddItemModal';
import QuickRepairModal from '../../components/repairs/QuickRepairModal';
import { toast } from 'sonner';
import { Package, Plus, Search, Trash2, Edit, Wrench, Clock, Heart, Sparkles } from 'lucide-react';

export default function ItemsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickRepairItem, setQuickRepairItem] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-items', page, search],
    queryFn: () =>
      api.get(`/items?page=${page}&limit=12${search ? `&search=${search}` : ''}`).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-items']);
      toast.success('Item removed');
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const conditionColors = {
    new: 'badge-green',
    good: 'badge-green',
    fair: 'badge-yellow',
    poor: 'badge-yellow',
    broken: 'badge-red',
    for_parts: 'badge-gray',
  };

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Items</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your registered items and post 1-click repair requests anytime
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickAdd(true)}
            className="btn-primary shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>+ Add Item (1-Click)</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-10 text-sm"
            placeholder="Search items by name, brand, category..."
          />
        </div>
      </div>

      {data?.items?.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items yet"
          description="Add your first item in one click to get started with repairs, quotations, or donations."
          action={
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="btn-primary flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>+ Add Item (1-Click)</span>
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.items?.map((item) => (
              <div key={item._id} className="card hover:shadow-md transition-shadow group flex flex-col justify-between">
                {/* Image */}
                <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
                  {item.images?.length > 0 ? (
                    <img
                      src={item.images[0].url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.parentElement.innerHTML =
                          '<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300"><svg class="w-12 h-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>';
                      }}
                    />
                  ) : (
                    <Package className="w-12 h-12 text-gray-300" />
                  )}

                  <span
                    className={`absolute top-2.5 right-2.5 shadow-xs text-[11px] font-bold uppercase tracking-wider ${
                      conditionColors[item.condition] || 'badge-gray'
                    }`}
                  >
                    {item.condition?.replace('_', ' ')}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                      {item.brand && <span className="font-medium text-gray-700">{item.brand}</span>}
                      {item.category?.name && (
                        <span className="badge-blue text-[10px]">{item.category.name}</span>
                      )}
                    </div>
                    {item.approximateAge && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" /> {item.approximateAge.value} {item.approximateAge.unit} old
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                    {/* 1-Click Repair button */}
                    <button
                      type="button"
                      onClick={() => setQuickRepairItem(item)}
                      className="btn-primary btn-sm flex-1 flex items-center justify-center gap-1 shadow-xs"
                      title="Post 1-click repair request"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Repair (1-Click)</span>
                    </button>

                    <Link
                      to={`/donations/new?item=${item._id}`}
                      className="btn-outline btn-sm text-pink-700 hover:bg-pink-50 hover:border-pink-300 flex items-center justify-center gap-1 px-2.5"
                      title="Donate this item"
                    >
                      <Heart className="w-3.5 h-3.5 text-pink-600 fill-pink-100" />
                    </Link>

                    <Link
                      to={`/items/${item._id}/edit`}
                      className="btn-ghost btn-sm text-gray-500 hover:text-primary-700 hover:bg-primary-50 px-2"
                      title="Edit item"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeleteId(item._id)}
                      className="btn-ghost btn-sm text-gray-400 hover:text-danger-600 px-2"
                      title="Remove item"
                    >
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

      {/* Quick Add Item Modal */}
      <QuickAddItemModal open={showQuickAdd} onClose={() => setShowQuickAdd(false)} />

      {/* Quick 1-Click Repair Modal */}
      <QuickRepairModal
        open={!!quickRepairItem}
        item={quickRepairItem}
        onClose={() => setQuickRepairItem(null)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Remove Item"
        message="This will mark the item as removed. This action cannot be undone."
        confirmText="Remove"
        danger
      />
    </div>
  );
}
