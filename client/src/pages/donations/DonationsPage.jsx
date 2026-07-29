import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, EmptyState, StatusBadge, Pagination } from '../../components/ui';
import { Heart, Plus, Calendar, ArrowRight, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DonationsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['donations', page],
    queryFn: () => api.get(`/donations?page=${page}&limit=12`).then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.role === 'organization' ? 'Browse available items for donation' : 'Donate items to community organizations'}
          </p>
        </div>
        {user?.role === 'owner' && (
          <Link to="/items" className="btn-primary"><Plus className="w-4 h-4" /> Create Donation</Link>
        )}
      </div>

      {data?.donations?.length === 0 ? (
        <EmptyState icon={Heart} title="No donations yet"
          description={user?.role === 'owner' ? 'Create a donation offer for items you want to give away.' : 'Check back later for available donations.'} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.donations?.map((d) => (
              <Link key={d._id} to={`/donations/${d._id}`} className="card hover:shadow-md transition-shadow group">
                <div className="h-36 bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
                  {d.item?.images?.length > 0 ? (
                    <img src={d.item.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Heart className="w-10 h-10 text-pink-300" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{d.item?.title || 'Donation'}</h3>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{d.description || 'No description'}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" /> {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
