import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState, Pagination } from '../../components/ui';
import {
  Wrench,
  Search,
  Star,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

export default function TechniciansPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [page, setPage] = useState(1);

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-active'],
    queryFn: () => api.get('/categories?active=true').then((r) => r.data.data.categories),
  });

  // Fetch technicians directory
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-technicians-directory', { search, category: selectedCategory, availability: selectedAvailability, page }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedAvailability !== 'all') params.append('availabilityStatus', selectedAvailability);
      params.append('page', page);
      params.append('limit', 12);
      return api.get(`/technicians?${params.toString()}`).then((r) => r.data.data);
    },
  });

  const technicians = data?.technicians || [];
  const pagination = data?.pagination;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="page-container max-w-6xl space-y-8">
      {/* DIRECTORY HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary-900 via-primary-800 to-emerald-900 text-white p-8 sm:p-10 shadow-lg">
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-emerald-300 border border-white/15 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Community Network
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Find Trusted Local Repair Technicians
          </h1>
          <p className="text-sm sm:text-base text-gray-200 leading-relaxed">
            Browse verified electronics, bicycle, audio, and appliance specialists in your community. Direct contact, fair transparent pricing, and zero landfill waste.
          </p>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="card card-body p-4 sm:p-5 bg-white shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search technicians by name, skills, or city..."
              className="input pl-10 text-xs sm:text-sm w-full"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="input text-xs sm:text-sm w-full sm:w-48"
            >
              <option value="">All Categories</option>
              {categoriesData?.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={selectedAvailability}
              onChange={(e) => {
                setSelectedAvailability(e.target.value);
                setPage(1);
              }}
              className="input text-xs sm:text-sm w-full sm:w-40"
            >
              <option value="all">Any Status</option>
              <option value="available">🟢 Available</option>
              <option value="busy">🟡 Low Capacity</option>
            </select>

            <button type="submit" className="btn-primary text-xs shrink-0 px-4">
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* TECHNICIANS DIRECTORY GRID */}
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} />
      ) : technicians.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No Technicians Found"
          description="Try adjusting your search criteria or removing category filters."
          actionText="Clear Filters"
          onAction={() => {
            setSearch('');
            setSelectedCategory('');
            setSelectedAvailability('all');
            setPage(1);
          }}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {technicians.map((t) => {
              const profileLink = `/technicians/${t.userId || t._id}`;
              const isAvailable = t.availabilityStatus === 'available';

              return (
                <div
                  key={t._id}
                  className="card bg-white border hover:shadow-md hover:border-primary-200 transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-4">
                    {/* Header: Photo, Name, Verified */}
                    <div className="flex items-start gap-3.5">
                      <Link to={profileLink} className="shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg overflow-hidden border border-primary-200 shadow-inner group-hover:scale-105 transition-transform">
                          {t.profileImage?.url ? (
                            <img src={t.profileImage.url} alt={t.fullName} className="w-full h-full object-cover" />
                          ) : (
                            t.fullName?.charAt(0) || 'T'
                          )}
                        </div>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link to={profileLink} className="font-bold text-sm text-gray-900 hover:text-primary-600 truncate block">
                            {t.professionalName || t.fullName}
                          </Link>
                          {t.verificationStatus === 'approved' && (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" title="Verified Technician" />
                          )}
                        </div>

                        {t.city && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{t.city}</span>
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{t.averageRating > 0 ? t.averageRating.toFixed(1) : '5.0'}</span>
                          </div>
                          <span className="text-[11px] text-gray-400">({t.reviewCount || 0} reviews)</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[11px] text-gray-500 font-semibold">{t.completedRepairCount || 0} jobs</span>
                        </div>
                      </div>
                    </div>

                    {/* Specialized Skills */}
                    {t.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.skills.slice(0, 3).map((s, idx) => (
                          <span key={idx} className="badge-blue text-[10px]">
                            {s.name || s}
                          </span>
                        ))}
                        {t.skills.length > 3 && (
                          <span className="text-[10px] text-gray-400 self-center font-medium">
                            +{t.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-3.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isAvailable ? '🟢 Available' : '🟡 Busy'}
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        to={profileLink}
                        className="btn-outline btn-sm text-xs py-1 px-2.5 font-semibold"
                      >
                        View Profile
                      </Link>
                      <Link
                        to="/repair-requests/new"
                        className="btn-primary btn-sm text-xs py-1 px-2.5 shadow-xs"
                      >
                        Hire
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </div>
      )}
    </div>
  );
}
