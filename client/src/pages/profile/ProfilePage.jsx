import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, StatusBadge } from '../../components/ui';
import EditProfileModal from '../../components/profile/EditProfileModal';
import SecuritySettingsTab from '../../components/profile/SecuritySettingsTab';
import PortfolioManager from '../../components/profile/PortfolioManager';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  User,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Edit,
  ShieldCheck,
  Star,
  Package,
  Wrench,
  Heart,
  Recycle,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Camera,
  Layers,
  Settings,
  Building,
  Briefcase,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const avatarInputRef = useRef(null);

  // Fetch full authenticated user profile & role data
  const { data: profileRes, isLoading, error } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/users/me').then((r) => r.data.data),
  });

  // Fetch role-specific statistics
  const { data: statsRes } = useQuery({
    queryKey: ['my-profile-stats'],
    queryFn: () => api.get('/users/me/stats').then((r) => r.data.data),
  });

  // Fetch owner recent activities
  const { data: activityRes } = useQuery({
    queryKey: ['my-profile-activity'],
    queryFn: () => api.get('/users/me/activity').then((r) => r.data.data),
    enabled: user?.role === 'owner',
  });

  // Fetch owner items for Items Tab
  const { data: itemsRes } = useQuery({
    queryKey: ['my-profile-items'],
    queryFn: () => api.get('/items?limit=6').then((r) => r.data.data),
    enabled: activeTab === 'items' && user?.role === 'owner',
  });

  // Fetch owner repair requests for Repairs Tab
  const { data: repairsRes } = useQuery({
    queryKey: ['my-profile-repairs'],
    queryFn: () => api.get('/repair-requests?limit=6').then((r) => r.data.data),
    enabled: activeTab === 'repairs' && user?.role === 'owner',
  });

  // Fetch technician reviews for Reviews Tab
  const { data: reviewsRes } = useQuery({
    queryKey: ['my-profile-reviews'],
    queryFn: () => api.get(`/technicians/${user?.userId}/reviews`).then((r) => r.data.data),
    enabled: activeTab === 'reviews' && user?.role === 'technician',
  });

  // Direct avatar file upload handler
  const handleQuickAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar image must be under 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Avatar updated successfully!');
      queryClient.invalidateQueries(['my-profile']);
      queryClient.invalidateQueries(['auth-me']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update avatar');
    }
  };

  // Quick availability toggle for Technician
  const handleAvailabilityChange = async (newStatus) => {
    try {
      await api.patch('/technicians/me/availability', { availabilityStatus: newStatus });
      toast.success(`Availability set to ${newStatus}`);
      queryClient.invalidateQueries(['my-profile']);
    } catch (err) {
      toast.error('Failed to update availability status');
    }
  };

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const userData = profileRes?.user || user;
  const roleProfile = profileRes?.roleProfile;
  const completionPercentage = profileRes?.completionPercentage ?? 60;
  const stats = statsRes?.stats || {};
  const activities = activityRes?.activities || [];

  // Determine tabs per role
  const getTabs = () => {
    switch (userData?.role) {
      case 'technician':
        return [
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'services', label: 'Services & Pricing', icon: Briefcase },
          { id: 'portfolio', label: 'Portfolio Showcase', icon: Layers },
          { id: 'reviews', label: 'Reviews', icon: Star },
          { id: 'settings', label: 'Security & Settings', icon: Settings },
        ];
      case 'organization':
        return [
          { id: 'overview', label: 'Overview', icon: Building },
          { id: 'acceptedItems', label: 'Accepted Items', icon: Package },
          { id: 'locations', label: 'Service Locations', icon: MapPin },
          { id: 'impact', label: 'Community Impact', icon: Heart },
          { id: 'settings', label: 'Security & Settings', icon: Settings },
        ];
      case 'admin':
        return [
          { id: 'overview', label: 'Account Overview', icon: User },
          { id: 'settings', label: 'Security & Settings', icon: Settings },
        ];
      case 'owner':
      default:
        return [
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'items', label: 'My Items', icon: Package },
          { id: 'repairs', label: 'Repair History', icon: Wrench },
          { id: 'settings', label: 'Security & Settings', icon: Settings },
        ];
    }
  };

  const tabs = getTabs();

  return (
    <div className="page-container max-w-5xl space-y-6">
      {/* HEADER CARD */}
      <div className="card bg-white border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="h-32 sm:h-40 bg-gradient-to-r from-primary-700 via-primary-800 to-emerald-900 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
            {/* Avatar with Camera Trigger */}
            <div className="flex items-end gap-4">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-primary-700 font-bold text-3xl">
                  {userData?.profileImage?.url ? (
                    <img
                      src={userData.profileImage.url}
                      alt={userData.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userData?.fullName?.charAt(0) || 'U'
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition-transform active:scale-95 border-2 border-white"
                  title="Upload profile photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQuickAvatarUpload}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                    {userData?.fullName}
                  </h1>
                  {roleProfile?.verificationStatus === 'approved' && (
                    <span className="badge-green flex items-center gap-1 font-bold text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified {userData?.role === 'technician' ? 'Technician' : 'Organization'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                  <span className="capitalize font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
                    {userData?.role} Account
                  </span>
                  {userData?.city && <span>• {userData.city}</span>}
                  <span>• Member since {new Date(userData?.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                </p>
              </div>
            </div>

            {/* Actions: Edit Profile Button & Public Profile Link */}
            <div className="flex items-center gap-2.5">
              {(userData?.role === 'technician' || userData?.role === 'organization') && (
                <Link
                  to={userData?.role === 'technician' ? `/technicians/${userData._id}` : `/organizations/${userData._id}`}
                  className="btn-outline btn-sm text-xs flex items-center gap-1.5"
                  title="View how others see your profile"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Public Profile
                </Link>
              )}

              <button
                onClick={() => setEditModalOpen(true)}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Profile
              </button>
            </div>
          </div>

          {/* Profile Completion Indicator */}
          <div className="mt-4 p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-primary-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-800">
                  Profile Completion: {completionPercentage}%
                </p>
                <p className="text-[11px] text-gray-500">
                  {completionPercentage === 100
                    ? 'Your profile is 100% complete and fully verified!'
                    : 'Complete your bio, service area, and contact preferences to build trust.'}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-48 bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* HORIZONTALLY SCROLLABLE TAB NAVIGATION */}
      <div className="border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                    : 'bg-white border border-gray-200/80 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* ROLE SPECIFIC STATS CARDS */}
          {userData?.role === 'owner' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link to="/items" className="card card-body text-center hover:border-primary-300 transition-colors group">
                <Package className="w-6 h-6 text-primary-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-2xl font-extrabold text-gray-900">{stats.registeredItems ?? 0}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Registered Items</p>
              </Link>

              <Link to="/repair-requests" className="card card-body text-center hover:border-primary-300 transition-colors group">
                <Wrench className="w-6 h-6 text-amber-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-2xl font-extrabold text-gray-900">{stats.activeRepairs ?? 0}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Active Repairs</p>
              </Link>

              <div className="card card-body text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-gray-900">{stats.completedRepairs ?? 0}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Completed</p>
              </div>

              <Link to="/donations" className="card card-body text-center hover:border-primary-300 transition-colors group">
                <Heart className="w-6 h-6 text-rose-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-2xl font-extrabold text-gray-900">{stats.totalDonations ?? 0}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Donations</p>
              </Link>

              <div className="card card-body text-center col-span-2 sm:col-span-1">
                <Recycle className="w-6 h-6 text-sky-500 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-gray-900">{stats.recyclingItems ?? 0}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Recycling</p>
              </div>
            </div>
          )}

          {userData?.role === 'technician' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card card-body text-center">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-gray-900">
                  {roleProfile?.averageRating > 0 ? roleProfile.averageRating.toFixed(1) : '5.0'}
                </p>
                <p className="text-xs text-gray-500 font-medium">({roleProfile?.reviewCount || 0} reviews)</p>
              </div>

              <div className="card card-body text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-gray-900">
                  {roleProfile?.completedRepairCount || 0}
                </p>
                <p className="text-xs text-gray-500 font-medium">Completed Repairs</p>
              </div>

              <div className="card card-body text-center">
                <Clock className="w-6 h-6 text-sky-600 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-gray-900">
                  {roleProfile?.yearsOfExperience || 1} yrs
                </p>
                <p className="text-xs text-gray-500 font-medium">Experience</p>
              </div>

              {/* Quick Availability Status Selector */}
              <div className="card card-body flex flex-col justify-center">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Availability
                </label>
                <select
                  value={roleProfile?.availabilityStatus || 'available'}
                  onChange={(e) => handleAvailabilityChange(e.target.value)}
                  className="input !py-1.5 !text-xs font-semibold"
                >
                  <option value="available">🟢 Available for Work</option>
                  <option value="busy">🟡 Busy / Low Capacity</option>
                  <option value="unavailable">🔴 Away / Unavailable</option>
                </select>
              </div>
            </div>
          )}

          {userData?.role === 'organization' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card card-body text-center">
                <Heart className="w-6 h-6 text-rose-500 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-gray-900">
                  {roleProfile?.impactStats?.totalDonationsReceived || 0}
                </p>
                <p className="text-xs text-gray-500 font-medium">Donations Received</p>
              </div>
              <div className="card card-body text-center">
                <Package className="w-6 h-6 text-primary-600 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-gray-900">
                  {roleProfile?.impactStats?.totalItemsProcessed || 0}
                </p>
                <p className="text-xs text-gray-500 font-medium">Items Distributed</p>
              </div>
              <div className="card card-body text-center">
                <Recycle className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-gray-900">
                  {roleProfile?.impactStats?.totalWeightProcessed || 0} kg
                </p>
                <p className="text-xs text-gray-500 font-medium">E-Waste Diverted</p>
              </div>
            </div>
          )}

          {/* TWO-COLUMN DETAILS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: About & Contact Information */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card card-body">
                <h3 className="section-title !mb-2">Biography & Mission</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {userData?.bio || roleProfile?.biography || (
                    <span className="text-gray-400 italic">
                      No biography provided yet. Click "Edit Profile" to share details with the community.
                    </span>
                  )}
                </p>
              </div>

              {/* Owner Recent Activity Stream */}
              {userData?.role === 'owner' && (
                <div className="card card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="section-title !mb-0 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary-600" />
                      Recent Activity
                    </h3>
                  </div>

                  {activities.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No recent activity records.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {activities.map((act) => (
                        <Link
                          key={act.id}
                          to={act.link}
                          className="py-3 flex items-center justify-between hover:bg-gray-50/80 -mx-2 px-2 rounded-xl transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary-700">
                              {act.title}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(act.timestamp).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 transition-transform" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Contact & Account Summary */}
            <div className="space-y-4">
              <div className="card card-body">
                <h3 className="font-bold text-sm text-gray-900 mb-3">Contact & Identity</h3>
                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{userData?.email}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{userData?.phone || 'No phone added'}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{userData?.serviceArea ? `${userData.serviceArea}, ${userData.city}` : userData?.city || 'Location not set'}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Joined {new Date(userData?.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Technician Skills card */}
              {userData?.role === 'technician' && roleProfile?.skills?.length > 0 && (
                <div className="card card-body">
                  <h3 className="font-bold text-sm text-gray-900 mb-3">Skills & Expertise</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {roleProfile.skills.map((s, idx) => (
                      <span key={idx} className="badge-blue text-[11px]">
                        {s.name || s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY ITEMS (Owner) */}
      {/* ========================================================================= */}
      {activeTab === 'items' && userData?.role === 'owner' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Your Registered Items</h3>
            <Link to="/items/new" className="btn-primary btn-sm">
              Add New Item
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {itemsRes?.items?.map((item) => (
              <div key={item._id} className="card p-3 border hover:shadow-sm">
                <div className="h-32 bg-gray-100 rounded-xl overflow-hidden mb-2">
                  {item.images?.[0]?.url ? (
                    <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <p className="font-bold text-sm text-gray-900 truncate">{item.title}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{item.category?.name || 'General'}</span>
                  <span className="badge-gray capitalize">{item.condition}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REPAIR HISTORY (Owner) */}
      {/* ========================================================================= */}
      {activeTab === 'repairs' && userData?.role === 'owner' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Repair History</h3>
            <Link to="/repair-requests/new" className="btn-primary btn-sm">
              New Repair Request
            </Link>
          </div>

          <div className="card divide-y divide-gray-100">
            {repairsRes?.repairRequests?.map((rr) => (
              <Link
                key={rr._id}
                to={`/repair-requests/${rr._id}`}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div>
                  <h4 className="font-bold text-sm text-gray-900 group-hover:text-primary-600">
                    {rr.item?.title || 'Repair Request'}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{rr.problemDescription}</p>
                </div>
                <StatusBadge status={rr.requestStatus} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SERVICES & PRICING (Technician) */}
      {/* ========================================================================= */}
      {activeTab === 'services' && userData?.role === 'technician' && (
        <div className="card card-body space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Supported Categories</h3>
            <div className="flex flex-wrap gap-2">
              {roleProfile?.supportedCategories?.map((c, i) => (
                <span key={i} className="badge-green text-xs font-semibold py-1 px-3">
                  {c.name || c}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="font-bold text-xs text-gray-500 uppercase">Starting Inspection Charge</h4>
              <p className="text-lg font-extrabold text-gray-900 mt-1">৳ {roleProfile?.minimumServiceCharge || 0}</p>
            </div>

            <div>
              <h4 className="font-bold text-xs text-gray-500 uppercase">Service Radius</h4>
              <p className="text-lg font-extrabold text-gray-900 mt-1">{roleProfile?.maximumServiceDistance || 25} km</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h4 className="font-bold text-xs text-gray-500 uppercase mb-1">Warranty & Guarantee Policy</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {roleProfile?.warrantyPolicy || '30 days warranty on replaced parts and service.'}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PORTFOLIO SHOWCASE (Technician) */}
      {/* ========================================================================= */}
      {activeTab === 'portfolio' && userData?.role === 'technician' && (
        <PortfolioManager portfolio={roleProfile?.portfolio || []} />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REVIEWS (Technician) */}
      {/* ========================================================================= */}
      {activeTab === 'reviews' && userData?.role === 'technician' && (
        <div className="card card-body space-y-4">
          <h3 className="font-bold text-gray-900">Verified Customer Reviews</h3>
          {reviewsRes?.reviews?.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No reviews yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {reviewsRes?.reviews?.map((r) => (
                <div key={r._id} className="py-3">
                  <div className="flex items-center gap-1 text-amber-500 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-800 font-medium">{r.comment}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {r.author?.fullName || 'Verified Customer'} • {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ACCEPTED ITEMS & GUIDELINES (Organization) */}
      {/* ========================================================================= */}
      {activeTab === 'acceptedItems' && userData?.role === 'organization' && (
        <div className="space-y-6">
          <div className="card card-body">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" /> Accepted Item Categories
            </h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {roleProfile?.acceptedItemCategories?.map((cat, idx) => (
                <span key={idx} className="badge-green text-xs font-semibold py-1 px-3">
                  {cat.name || cat}
                </span>
              ))}
            </div>
          </div>

          <div className="card card-body border-danger-100 bg-danger-50/20">
            <h3 className="font-bold text-danger-800 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-danger-600" /> Items Not Accepted / Safety Hazards
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              For safety compliance, we cannot accept swollen lithium batteries, leaking chemicals, pressurized
              tanks, or bio-hazardous materials.
            </p>
            <div className="flex flex-wrap gap-2">
              {roleProfile?.rejectedCategories?.length > 0 ? (
                roleProfile.rejectedCategories.map((cat, idx) => (
                  <span key={idx} className="badge-red text-xs font-semibold py-1 px-3">
                    {cat.name || cat}
                  </span>
                ))
              ) : (
                <span className="badge-gray text-xs">Hazardous / Contaminated Goods</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: SERVICE LOCATIONS (Organization) */}
      {/* ========================================================================= */}
      {activeTab === 'locations' && userData?.role === 'organization' && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900">Collection & Drop-Off Hubs</h3>
          {roleProfile?.locations?.length === 0 ? (
            <div className="card card-body text-center py-8 text-gray-400 text-xs">
              No specific physical locations registered yet. Click "Edit Profile" to add hubs.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {roleProfile?.locations?.map((loc, idx) => (
                <div key={idx} className="card card-body border">
                  <h4 className="font-bold text-sm text-gray-900">{loc.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">{loc.address}</p>
                  <p className="text-xs text-primary-700 mt-2 font-medium">🕒 {loc.operatingHours || 'Standard Hours'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: SETTINGS TAB (All roles) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && <SecuritySettingsTab user={userData} />}

      {/* EDIT PROFILE MODAL */}
      {editModalOpen && (
        <EditProfileModal
          user={userData}
          roleProfile={roleProfile}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
}
