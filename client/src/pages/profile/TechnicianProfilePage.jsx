import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, Pagination } from '../../components/ui';
import ReviewCard from '../../components/reviews/ReviewCard';
import { ArrowLeft, Star, MapPin, Calendar, CheckCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function TechnicianProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['technician', id],
    queryFn: () => api.get(`/technicians/${id}`).then(r => r.data.data.technician),
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['technician-reviews', id, page],
    queryFn: () => api.get(`/technicians/${id}/reviews?page=${page}&limit=10`).then(r => r.data.data),
  });

  if (profileLoading) return <PageLoader />;
  if (profileError) return <ErrorState error={profileError} />;

  const tech = profileData;
  const user = tech?.user;

  return (
    <div className="page-container max-w-4xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-6"><ArrowLeft className="w-4 h-4" /> Back</button>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Profile Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="card card-body text-center flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-bold mb-4 shadow-inner">
              {user?.fullName?.charAt(0) || 'T'}
            </div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 justify-center">
              {user?.fullName}
              {tech?.verificationStatus === 'approved' && <ShieldCheck className="w-5 h-5 text-green-500" />}
            </h1>
            
            <div className="flex items-center gap-1 mt-2 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              {tech?.averageRating > 0 ? tech.averageRating.toFixed(1) : 'No ratings'} 
              <span className="text-yellow-600/70 font-normal ml-1">({tech?.reviewCount} reviews)</span>
            </div>

            <div className="mt-6 w-full space-y-3 text-sm text-gray-600 text-left">
              {tech?.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span>{tech.address.city}, {tech.address.state}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <span>Joined {new Date(user?.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{tech?.completedJobs || 0} Jobs Completed</span>
              </div>
            </div>
          </div>

          <div className="card card-body">
            <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
            {tech?.skills?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tech.skills.map((s, i) => (
                  <span key={i} className="badge-blue">{s.name || s}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No skills listed</p>
            )}
          </div>
        </div>

        {/* Right Column: Bio & Reviews */}
        <div className="md:col-span-2 space-y-6">
          <div className="card card-body">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
              {tech?.bio || "This technician hasn't added a bio yet."}
            </p>
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
            </div>
            
            <div className="p-6">
              {reviewsLoading ? (
                <div className="flex justify-center py-8"><PageLoader /></div>
              ) : reviewsData?.reviews?.length > 0 ? (
                <div className="space-y-4">
                  {reviewsData.reviews.map(review => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                  <Pagination pagination={reviewsData.pagination} onPageChange={setPage} />
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No reviews yet</p>
                  <p className="text-sm text-gray-400 mt-1">This technician doesn't have any reviews.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
