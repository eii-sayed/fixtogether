import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  MapPin,
  ShieldCheck,
  Wrench,
  Heart,
  Package,
  Star,
  MessageCircle,
  ArrowLeft,
  ExternalLink,
  Award,
  CheckCircle2,
  Building,
} from 'lucide-react';

export default function UserProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const { data: profileRes, isLoading, error } = useQuery({
    queryKey: ['user-public-profile', id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data.data.user),
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;

  if (error || !profileRes) {
    return (
      <div className="page-container max-w-xl py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto shadow-xs">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">User Profile Not Found</h2>
        <p className="text-sm text-gray-500">
          The user profile you are looking for may not exist or has set their account to private.
        </p>
        <div className="pt-2">
          <button onClick={() => navigate(-1)} className="btn-primary text-xs">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const u = profileRes;
  const isSelf = currentUser && (currentUser.userId === u._id || currentUser._id === u._id);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'technician':
        return (
          <span className="badge-blue text-xs font-bold flex items-center gap-1">
            <Wrench className="w-3 h-3" /> Verified Technician
          </span>
        );
      case 'organization':
        return (
          <span className="badge-purple text-xs font-bold flex items-center gap-1">
            <Building className="w-3 h-3" /> Community Partner
          </span>
        );
      case 'admin':
        return (
          <span className="badge-red text-xs font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Platform Staff
          </span>
        );
      case 'owner':
      default:
        return (
          <span className="badge-green text-xs font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Community Member
          </span>
        );
    }
  };

  return (
    <div className="page-container max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 text-xs flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* USER PROFILE CARD */}
      <div className="card bg-white border overflow-hidden shadow-xs">
        <div className="h-28 sm:h-32 bg-gradient-to-r from-primary-700 via-primary-600 to-emerald-700" />

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-14 gap-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-primary-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-primary-700 text-3xl font-bold shrink-0">
                {u?.profileImage?.url ? (
                  <img src={u.profileImage.url} alt={u.fullName} className="w-full h-full object-cover" />
                ) : (
                  u?.fullName?.charAt(0) || 'U'
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{u?.fullName}</h1>
                  {getRoleBadge(u?.role)}
                </div>

                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                  {u?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {u.city} {u.serviceArea ? `• ${u.serviceArea}` : ''}
                    </span>
                  )}
                  <span>• Member since {new Date(u?.memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
                </p>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2.5">
              {isSelf ? (
                <Link to="/profile" className="btn-outline btn-sm text-xs font-semibold">
                  Edit My Profile
                </Link>
              ) : (
                currentUser && (
                  <Link
                    to={`/messages`}
                    className="btn-primary btn-sm flex items-center gap-1.5 text-xs shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Message
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Bio Description */}
          {u?.bio && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-700 leading-relaxed max-w-2xl">{u.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* SPECIALIZED ROLE SHOWCASE BANNER */}
      {u?.role === 'technician' && u?.technicianProfile && (
        <div className="card card-body bg-gradient-to-r from-primary-50 via-emerald-50/60 to-white border-primary-200/80 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-600/20">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <span>{u.technicianProfile.professionalName || u.fullName}</span>
                  <span className="badge-green text-[10px]">Verified Technician</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Specialized technician with {u.technicianProfile.yearsOfExperience || 1}+ years repair experience
                </p>
              </div>
            </div>

            <Link
              to={`/technicians/${u._id}`}
              className="btn-primary btn-sm flex items-center gap-1.5 text-xs shrink-0 shadow-xs"
            >
              <span>View Full Showcase & Reviews</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Technician Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/80 p-3 rounded-xl border border-primary-100 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span className="font-bold text-sm text-gray-900">
                  {u.technicianProfile.averageRating > 0 ? u.technicianProfile.averageRating.toFixed(1) : '5.0'}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">({u.technicianProfile.reviewCount || 0} reviews)</p>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-primary-100 text-center">
              <span className="font-bold text-sm text-gray-900">{u.technicianProfile.completedRepairCount || 0}</span>
              <p className="text-[10px] text-gray-500 mt-0.5">Repairs Done</p>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-primary-100 text-center">
              <span className="font-bold text-sm text-gray-900">{u.technicianProfile.yearsOfExperience || 1} yrs</span>
              <p className="text-[10px] text-gray-500 mt-0.5">Experience</p>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-primary-100 text-center">
              <span className="font-bold text-sm text-gray-900 capitalize">
                {u.technicianProfile.availabilityStatus || 'Available'}
              </span>
              <p className="text-[10px] text-gray-500 mt-0.5">Status</p>
            </div>
          </div>
        </div>
      )}

      {u?.role === 'organization' && u?.organizationProfile && (
        <div className="card card-body bg-gradient-to-r from-purple-50 via-teal-50 to-white border-purple-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                {u.organizationProfile.organizationName || u.fullName}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Refurbishment & Community Donation Distribution Hub
              </p>
            </div>
          </div>

          <Link
            to={`/organizations/${u._id}`}
            className="btn-secondary btn-sm flex items-center gap-1.5 text-xs shrink-0"
          >
            <span>View Organization Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* COMMUNITY CONTRIBUTION LEDGER */}
      <div className="card card-body space-y-4">
        <h2 className="section-title flex items-center gap-2">
          <Award className="w-4 h-4 text-primary-600" /> Community Contribution & Impact
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900">{u?.stats?.itemsRegistered || 0}</div>
              <p className="text-xs text-gray-500">Items Maintained</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900">{u?.stats?.repairsCompleted || 0}</div>
              <p className="text-xs text-gray-500">Repairs Saved</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900">{u?.stats?.donationsContributed || 0}</div>
              <p className="text-xs text-gray-500">Donations Donated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
