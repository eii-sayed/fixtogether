import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, Pagination } from '../../components/ui';
import ReviewCard from '../../components/reviews/ReviewCard';
import {
  ArrowLeft,
  Star,
  MapPin,
  Calendar,
  CheckCircle,
  ShieldCheck,
  Wrench,
  Clock,
  Phone,
  Mail,
  Layers,
  Award,
  DollarSign,
  Shield,
} from 'lucide-react';

export default function TechnicianProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('portfolio');

  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['technician', id],
    queryFn: () => api.get(`/technicians/${id}`).then((r) => r.data.data.technician),
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['technician-reviews', id, page],
    queryFn: () =>
      api.get(`/technicians/${profileData?.userId || id}/reviews?page=${page}&limit=10`).then((r) => r.data.data),
    enabled: !!profileData,
  });

  if (profileLoading) return <PageLoader />;
  if (profileError) return <ErrorState error={profileError} />;

  const tech = profileData;

  const getAvailabilityChip = (status) => {
    switch (status) {
      case 'busy':
        return <span className="badge-yellow text-xs font-bold">🟡 Busy / Low Capacity</span>;
      case 'unavailable':
        return <span className="badge-red text-xs font-bold">🔴 Away / Unavailable</span>;
      case 'available':
      default:
        return <span className="badge-green text-xs font-bold">🟢 Available for Work</span>;
    }
  };

  return (
    <div className="page-container max-w-5xl space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </button>

      {/* HEADER CARD */}
      <div className="card bg-white border overflow-hidden">
        <div className="h-32 sm:h-36 bg-gradient-to-r from-primary-800 to-emerald-900" />

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 sm:-mt-16 gap-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-primary-700 text-3xl font-bold">
                {tech?.profileImage?.url ? (
                  <img src={tech.profileImage.url} alt={tech.fullName} className="w-full h-full object-cover" />
                ) : (
                  tech?.fullName?.charAt(0) || 'T'
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                    {tech?.professionalName || tech?.fullName}
                  </h1>
                  {tech?.verificationStatus === 'approved' && (
                    <span className="badge-green flex items-center gap-1 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Tech
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <span>Repairs by {tech?.fullName}</span>
                  {tech?.city && <span>• {tech.city}</span>}
                  <span>• Joined {new Date(tech?.memberSince).toLocaleDateString(undefined, { year: 'numeric' })}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getAvailabilityChip(tech?.availabilityStatus)}
              <Link to="/repair-requests/new" className="btn-primary btn-sm flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> Request Repair
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="font-extrabold text-lg text-gray-900">
                  {tech?.averageRating > 0 ? tech.averageRating.toFixed(1) : '5.0'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">({tech?.reviewCount || 0} reviews)</p>
            </div>

            <div className="text-center">
              <p className="font-extrabold text-lg text-gray-900">{tech?.completedRepairCount || 0}</p>
              <p className="text-[11px] text-gray-500 font-medium">Completed Jobs</p>
            </div>

            <div className="text-center">
              <p className="font-extrabold text-lg text-gray-900">{tech?.yearsOfExperience || 1} yrs</p>
              <p className="text-[11px] text-gray-500 font-medium">Experience</p>
            </div>

            <div className="text-center">
              <p className="font-extrabold text-lg text-gray-900">৳ {tech?.minimumServiceCharge || '200+'}</p>
              <p className="text-[11px] text-gray-500 font-medium">Starting Fee</p>
            </div>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bio, Skills, Categories & Contact */}
        <div className="space-y-6">
          <div className="card card-body">
            <h3 className="font-bold text-gray-900 text-sm mb-2">About the Technician</h3>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
              {tech?.bio || 'Professional electronics technician specializing in component level repairs.'}
            </p>
          </div>

          <div className="card card-body">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Skills & Categories</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">Specialized Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {tech?.skills?.map((s, idx) => (
                    <span key={idx} className="badge-blue text-[11px]">
                      {s.name || s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">Supported Devices</p>
                <div className="flex flex-wrap gap-1.5">
                  {tech?.supportedCategories?.map((c, idx) => (
                    <span key={idx} className="badge-green text-[11px]">
                      {c.name || c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Warranty & Guarantee */}
          <div className="card card-body">
            <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600" /> Warranty Policy
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {tech?.warrantyPolicy || '30 days service warranty on repaired components.'}
            </p>
          </div>

          {/* Contact (if public) */}
          {(tech?.phone || tech?.email) && (
            <div className="card card-body space-y-2">
              <h3 className="font-bold text-gray-900 text-sm mb-2">Direct Contact</h3>
              {tech.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{tech.phone}</span>
                </div>
              )}
              {tech.email && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{tech.email}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Portfolio & Reviews Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
                activeTab === 'portfolio'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers className="w-4 h-4" /> Repair Portfolio ({tech?.portfolio?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
                activeTab === 'reviews'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Star className="w-4 h-4" /> Customer Reviews ({tech?.reviewCount || 0})
            </button>
          </div>

          {activeTab === 'portfolio' && (
            <div className="space-y-4">
              {tech?.portfolio?.length === 0 ? (
                <div className="card card-body text-center py-10 text-gray-400 text-xs">
                  This technician hasn't published showcase photos yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tech.portfolio.map((item) => (
                    <div key={item._id} className="card border overflow-hidden">
                      <div className="grid grid-cols-2 gap-0.5 bg-gray-200 h-36">
                        <div className="relative h-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {item.beforeImage?.url ? (
                            <img src={item.beforeImage.url} alt="Before" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-gray-400">No photo</span>
                          )}
                          <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Before
                          </span>
                        </div>
                        <div className="relative h-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {item.afterImage?.url ? (
                            <img src={item.afterImage.url} alt="After" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-gray-400">No photo</span>
                          )}
                          <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            After
                          </span>
                        </div>
                      </div>
                      <div className="p-3.5">
                        <h4 className="font-bold text-sm text-gray-900">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {reviewsLoading ? (
                <PageLoader />
              ) : reviewsData?.reviews?.length > 0 ? (
                <div className="space-y-3">
                  {reviewsData.reviews.map((review) => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                  <Pagination pagination={reviewsData.pagination} onPageChange={setPage} />
                </div>
              ) : (
                <div className="card card-body text-center py-10 text-gray-400 text-xs">
                  No verified customer reviews yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
