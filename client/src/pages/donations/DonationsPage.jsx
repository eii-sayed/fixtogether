import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, EmptyState, StatusBadge, Pagination, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import {
  Heart,
  Plus,
  Calendar,
  ArrowRight,
  Package,
  Truck,
  Building,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Sparkles,
  HelpCircle,
  Recycle,
  Wrench,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Eye,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DONATION_STATUS_CONFIG,
  COMMUNITY_NEED_STATUS_CONFIG,
  INSPECTION_OUTCOMES_CONFIG,
  PROCESSING_OUTCOMES_CONFIG,
  HUB_STATUS_CONFIG,
} from '../../utils/organizationStatusConfig';
import CreateDonationModal from '../../components/donations/CreateDonationModal';

export default function DonationsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const isOrg = user?.role === 'organization';
  const activeMainTab = searchParams.get('tab') || (isOrg ? 'offers' : 'my_donations');
  const activeOfferSubTab = searchParams.get('subtab') || 'recommended';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  // Modals & Drawers State
  const [showCreateDonationModal, setShowCreateDonationModal] = useState(false);
  const [preselectedNeedForDonation, setPreselectedNeedForDonation] = useState(null);
  const [cancellingOfferId, setCancellingOfferId] = useState(null);
  const [selectedOfferForExplanation, setSelectedOfferForExplanation] = useState(null);
  const [decisionModalOffer, setDecisionModalOffer] = useState(null);
  const [decisionAction, setDecisionAction] = useState('accept');
  const [decisionReason, setDecisionReason] = useState('');
  const [donorExplanation, setDonorExplanation] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Handover Scheduling Modal
  const [scheduleModalOffer, setScheduleModalOffer] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTimeWindow, setScheduleTimeWindow] = useState('09:00 - 13:00');
  const [scheduleMethod, setScheduleMethod] = useState('dropoff');
  const [scheduleHub, setScheduleHub] = useState('');

  // Receipt Confirmation Modal
  const [receiveModalOffer, setReceiveModalOffer] = useState(null);
  const [handoverConfirmationCode, setHandoverConfirmationCode] = useState('');

  // Inspection Checklist Modal
  const [inspectModalOffer, setInspectModalOffer] = useState(null);
  const [inspectChecklist, setInspectChecklist] = useState({
    itemIdentityVerified: true,
    quantityVerified: true,
    physicalCondition: 'fair',
    powerStateWorking: true,
    functionalityTested: true,
    missingAccessoriesChecked: true,
    dataComponentsChecked: true,
    safetyClearance: true,
    refurbishmentRequired: false,
  });
  const [inspectOutcome, setInspectOutcome] = useState('accepted_working');
  const [inspectPublicNotes, setInspectPublicNotes] = useState('');
  const [inspectInternalNotes, setInspectInternalNotes] = useState('');

  // Processing & Impact Modal
  const [processModalOffer, setProcessModalOffer] = useState(null);
  const [processOutcome, setProcessOutcome] = useState('redistributed');
  const [processWeightMethod, setProcessWeightMethod] = useState('measured');
  const [processWeightKg, setProcessWeightKg] = useState(2.5);
  const [processReplacementCost, setProcessReplacementCost] = useState(5000);
  const [processTeam, setProcessTeam] = useState('Community Redistribution Team');

  // Guided Community Need Builder Modal (5 steps)
  const [showNeedBuilder, setShowNeedBuilder] = useState(searchParams.get('new') === 'true');
  const [needStep, setNeedStep] = useState(1);
  const [needFormData, setNeedFormData] = useState({
    title: '',
    category: '',
    urgency: 'medium',
    quantityRequested: 5,
    minimumCondition: 'fair',
    requiredSpecifications: '',
    beneficiaryContext: '',
    pickupAvailable: false,
    targetDate: '',
  });

  // Fetch Categories for filters & builder
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
    staleTime: 60000,
  });

  // Fetch Organization Workspace Profile & Hubs
  const { data: orgProfileData } = useQuery({
    queryKey: ['org-workspace-profile'],
    queryFn: () => api.get('/organizations/me/workspace').then((r) => r.data.data),
    enabled: isOrg,
  });

  // Fetch Donation Offers
  const { data: offersData, isLoading: offersLoading } = useQuery({
    queryKey: ['donation-offers', activeOfferSubTab, page, categoryFilter, conditionFilter, search],
    queryFn: () =>
      api
        .get(
          `/donations/offers?tab=${activeOfferSubTab}&page=${page}&limit=12${
            categoryFilter ? `&category=${categoryFilter}` : ''
          }${conditionFilter ? `&condition=${conditionFilter}` : ''}${
            search ? `&search=${search}` : ''
          }`
        )
        .then((r) => r.data.data),
    enabled: isOrg && activeMainTab === 'offers',
  });

  // Fetch Community Needs
  const { data: needsData, isLoading: needsLoading } = useQuery({
    queryKey: ['community-needs', page],
    queryFn: () => api.get(`/donations/needs?page=${page}&limit=12`).then((r) => r.data.data),
    enabled: (isOrg && activeMainTab === 'needs') || (!isOrg && activeMainTab === 'community_needs'),
  });

  // Fetch Impact Records
  const { data: impactData, isLoading: impactLoading } = useQuery({
    queryKey: ['org-impact-ledger'],
    queryFn: () => api.get('/organizations/me/impact').then((r) => r.data.data),
    enabled: isOrg && activeMainTab === 'impact',
  });

  // Fetch Owner's donations (when role is owner)
  const { data: ownerDonationsData, isLoading: ownerDonationsLoading } = useQuery({
    queryKey: ['owner-donations', page],
    queryFn: () => api.get(`/donations?page=${page}&limit=12`).then((r) => r.data.data),
    enabled: !isOrg && activeMainTab === 'my_donations',
  });

  // Mutations
  const cancelOfferMutation = useMutation({
    mutationFn: (id) => api.post(`/donations/offers/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-donations']);
      setCancellingOfferId(null);
      toast.success('Donation offer cancelled');
    },
    onError: (err) => {
      setCancellingOfferId(null);
      toast.error(err.response?.data?.message || 'Failed to cancel donation offer');
    },
  });
  const decisionMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/donations/offers/${id}/decision`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['donation-offers']);
      queryClient.invalidateQueries(['org-workspace']);
      setDecisionModalOffer(null);
      toast.success('Offer decision recorded successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Decision failed'),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/donations/offers/${id}/schedule-handover`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['donation-offers']);
      queryClient.invalidateQueries(['org-workspace']);
      setScheduleModalOffer(null);
      toast.success(`Handover scheduled! Confirmation code: ${res.data?.data?.confirmationCode}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Scheduling failed'),
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, confirmationCode }) =>
      api.post(`/donations/offers/${id}/confirm-receipt`, { confirmationCode }),
    onSuccess: () => {
      queryClient.invalidateQueries(['donation-offers']);
      queryClient.invalidateQueries(['org-workspace']);
      setReceiveModalOffer(null);
      setHandoverConfirmationCode('');
      toast.success('Donation receipt confirmed at hub');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Receipt confirmation failed'),
  });

  const inspectMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/donations/offers/${id}/inspect`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['donation-offers']);
      queryClient.invalidateQueries(['org-workspace']);
      setInspectModalOffer(null);
      toast.success('Hardware technical inspection recorded');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Inspection recording failed'),
  });

  const processMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/donations/offers/${id}/process-outcome`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['donation-offers']);
      queryClient.invalidateQueries(['org-workspace']);
      queryClient.invalidateQueries(['org-impact-ledger']);
      setProcessModalOffer(null);
      toast.success('Processing outcome saved & community impact verified!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Processing outcome failed'),
  });

  const createNeedMutation = useMutation({
    mutationFn: (payload) => api.post('/donations/needs', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['community-needs']);
      queryClient.invalidateQueries(['org-workspace']);
      setShowNeedBuilder(false);
      setNeedStep(1);
      toast.success('Community need published successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Need creation failed'),
  });

  const handleTabChange = (newTab, newSubTab = null) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    if (newSubTab) params.set('subtab', newSubTab);
    else params.delete('subtab');
    setSearchParams(params);
    setPage(1);
  };

  const categories = categoriesData?.categories || [];
  const hubs = orgProfileData?.profile?.locations || [];
  const isOrgVerified = orgProfileData?.profile?.verificationStatus === 'approved';

  // OWNER VIEW
  if (!isOrg) {
    const ownerDonations = ownerDonationsData?.donations || ownerDonationsData?.offers || [];
    const communityNeeds = needsData?.needs || [];

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Community Donations & Hardware Reuse
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Give unused electronics, appliances, and hardware to certified non-profits, schools, and repair hubs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/items" className="btn-outline text-xs flex items-center gap-1.5 shadow-xs">
              <Package className="w-4 h-4" /> My Items
            </Link>
            <button
              onClick={() => {
                setPreselectedNeedForDonation(null);
                setShowCreateDonationModal(true);
              }}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Make a Donation
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleTabChange('my_donations')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'my_donations'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>My Donations</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeMainTab === 'my_donations' ? 'bg-pink-700 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {ownerDonations.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('community_needs')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'community_needs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Browse Community Needs</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeMainTab === 'community_needs' ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {communityNeeds.length}
            </span>
          </button>
        </div>

        {/* TAB 1: MY DONATIONS */}
        {activeMainTab === 'my_donations' && (
          <div>
            {ownerDonationsLoading ? (
              <PageLoader />
            ) : ownerDonations.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No Active Donations"
                description="You haven't offered any items for community donation yet. Browse active community needs or offer an item directly."
                action={
                  <div className="flex gap-2 justify-center mt-2">
                    <button
                      onClick={() => {
                        setPreselectedNeedForDonation(null);
                        setShowCreateDonationModal(true);
                      }}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Offer an Item
                    </button>
                    <button
                      onClick={() => handleTabChange('community_needs')}
                      className="btn-outline text-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" /> Browse Needs
                    </button>
                  </div>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {ownerDonations.map((d) => {
                  const statusInfo = DONATION_STATUS_CONFIG[d.status] || {
                    label: d.status,
                    color: 'bg-gray-100 text-gray-800 border-gray-200',
                  };
                  const orgName =
                    d.selectedOrganization?.organizationName ||
                    d.matchedOrganizations?.[0]?.organization?.organizationName ||
                    'Community Network';

                  const canCancel = d.status === 'published' || d.status === 'matched';

                  return (
                    <div
                      key={d._id}
                      className="card p-5 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between border border-gray-100"
                    >
                      <div className="space-y-3">
                        {/* Thumbnail */}
                        <div className="h-44 bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center relative border border-gray-100">
                          {d.item?.images?.length > 0 ? (
                            <img
                              src={d.item.images[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center">
                              <Heart className="w-8 h-8 text-pink-400 fill-pink-100" />
                            </div>
                          )}
                          <span
                            className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-xs shadow-2xs ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Title & Organization */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 truncate">
                            {d.item?.title || d.title || 'Donated Item'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                            <Building className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate">{orgName}</span>
                          </div>
                          {d.description && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                              {d.description}
                            </p>
                          )}
                        </div>

                        {/* Handover & Confirmation Box */}
                        {d.handover?.confirmationCode && (
                          <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                                Handover Code
                              </span>
                              <span className="text-xs font-mono font-black text-indigo-700 px-2 py-0.5 rounded-md bg-white border border-indigo-200">
                                {d.handover.confirmationCode}
                              </span>
                            </div>
                            <p className="text-[10px] text-indigo-600/90 leading-tight">
                              Show this verification code upon handing over your item.
                            </p>
                          </div>
                        )}

                        {/* Scheduled Handover Details */}
                        {d.handover?.scheduledDate && (
                          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <span>
                                {new Date(d.handover.scheduledDate).toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500 font-normal">
                                {d.handover.timeWindow || '09:00 - 13:00'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">
                                {d.handover.hub?.name ||
                                  d.handover.hub?.address?.city ||
                                  d.pickupLocation?.approximateArea ||
                                  'Designated Community Hub'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Status Messages */}
                        {d.status === 'received' && (
                          <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                            <span>Arrived at hub • Technical inspection in progress</span>
                          </div>
                        )}

                        {d.status === 'inspected' && (
                          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Technical inspection passed • Ready for reuse</span>
                          </div>
                        )}

                        {d.status === 'completed' && (
                          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                            <Recycle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Successfully redistributed to beneficiary • E-waste diverted</span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      {canCancel && (
                        <div className="pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            disabled={cancellingOfferId === d._id}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to withdraw this donation offer?')) {
                                setCancellingOfferId(d._id);
                                cancelOfferMutation.mutate(d._id);
                              }
                            }}
                            className="btn-outline btn-sm text-xs text-red-600 hover:bg-red-50 w-full flex items-center justify-center gap-1"
                          >
                            {cancellingOfferId === d._id ? (
                              'Cancelling...'
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Cancel Offer
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMMUNITY NEEDS */}
        {activeMainTab === 'community_needs' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-4 rounded-2xl border border-indigo-100/60 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Active Hardware Needs Posted by Non-Profits
                </h2>
                <p className="text-xs text-gray-500">
                  Select a community need to donate your hardware directly to students, teachers, and charitable clinics.
                </p>
              </div>
            </div>

            {needsLoading ? (
              <PageLoader />
            ) : communityNeeds.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No Community Needs Found"
                description="There are currently no active community needs posted. You can still make an open donation to the community pool."
                action={
                  <button
                    onClick={() => {
                      setPreselectedNeedForDonation(null);
                      setShowCreateDonationModal(true);
                    }}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Offer an Item to Community Pool
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {communityNeeds.map((need) => {
                  const urgencyColors = {
                    critical: 'bg-red-100 text-red-800 border-red-200',
                    high: 'bg-orange-100 text-orange-800 border-orange-200',
                    medium: 'bg-blue-100 text-blue-800 border-blue-200',
                    low: 'bg-gray-100 text-gray-700 border-gray-200',
                  };

                  const percentFulfilled = Math.min(
                    100,
                    Math.round(((need.quantityAccepted || 0) / (need.quantityRequested || 1)) * 100)
                  );

                  return (
                    <div
                      key={need._id}
                      className="card p-5 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between border border-gray-100"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              urgencyColors[need.urgency] || urgencyColors.medium
                            }`}
                          >
                            {need.urgency} Urgency
                          </span>
                          <span className="text-xs text-gray-500 font-semibold">
                            {need.category?.name || 'Hardware'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-gray-900 leading-snug">
                            {need.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-700 font-medium">
                            <Building className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{need.organization?.organizationName || 'Non-profit Organization'}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                            {need.description}
                          </p>
                        </div>

                        {need.beneficiaryContext && (
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-600">
                            <strong className="text-gray-800 block text-[10px] uppercase">
                              Beneficiary Story:
                            </strong>
                            <span className="line-clamp-2">{need.beneficiaryContext}</span>
                          </div>
                        )}

                        {/* Progress */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Fulfilled:</span>
                            <span className="font-bold text-gray-900">
                              {need.quantityAccepted || 0} of {need.quantityRequested} items ({percentFulfilled}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full transition-all"
                              style={{ width: `${percentFulfilled}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1">
                          <span>Min condition: {need.minimumCondition}</span>
                          {need.pickupAvailable && (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <Truck className="w-3 h-3" /> Pickup Available
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => {
                            setPreselectedNeedForDonation(need);
                            setShowCreateDonationModal(true);
                          }}
                          className="btn-primary btn-sm text-xs w-full flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Heart className="w-3.5 h-3.5 fill-white" /> Donate to this Need
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Global Create Donation Modal */}
        <CreateDonationModal
          open={showCreateDonationModal}
          onClose={() => {
            setShowCreateDonationModal(false);
            setPreselectedNeedForDonation(null);
          }}
          preselectedNeed={preselectedNeedForDonation}
        />
      </div>
    );
  }

  // ORGANIZATION WORKSPACE VIEW
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Donation Operations & Community Reuse Workspace
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isOrgVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              {isOrgVerified ? 'Verified Hub' : 'Verification In Progress'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review incoming donation offers, manage community needs, schedule collections, inspect received hardware, and record verified impact.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isOrgVerified) {
                toast.error('Approved organization verification is required to publish community needs.');
                return;
              }
              setShowNeedBuilder(true);
              setNeedStep(1);
            }}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Post Community Need
          </button>
        </div>
      </div>

      {/* Main Workspace Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleTabChange('offers', 'recommended')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === 'offers' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Heart className="w-4 h-4 text-pink-400" /> Donation Offers
        </button>
        <button
          onClick={() => handleTabChange('needs')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === 'needs' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Package className="w-4 h-4" /> Community Needs
        </button>
        <button
          onClick={() => handleTabChange('collections')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === 'collections' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Truck className="w-4 h-4 text-indigo-400" /> Collections & Logistics
        </button>
        <button
          onClick={() => handleTabChange('inspection')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === 'inspection' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-400" /> Inspection Bench
        </button>
        <button
          onClick={() => handleTabChange('impact')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === 'impact' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Recycle className="w-4 h-4 text-emerald-400" /> Impact Ledger
        </button>
        <button
          onClick={() => handleTabChange('hubs')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === 'hubs' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building className="w-4 h-4 text-blue-400" /> Hubs & Verification
        </button>
      </div>

      {/* TAB 1: DONATION OFFERS */}
      {activeMainTab === 'offers' && (
        <div className="space-y-4">
          {/* Subtabs for Offers */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: 'recommended', label: 'Recommended For You' },
              { key: 'new', label: `New Offers (${offersData?.tabCounts?.new || 0})` },
              { key: 'under_review', label: 'Under Review' },
              { key: 'accepted', label: `Accepted (${offersData?.tabCounts?.accepted || 0})` },
              { key: 'scheduled', label: `Scheduled (${offersData?.tabCounts?.scheduled || 0})` },
              { key: 'received', label: `Received (${offersData?.tabCounts?.received || 0})` },
              { key: 'completed', label: `Completed (${offersData?.tabCounts?.completed || 0})` },
              { key: 'rejected', label: `Declined (${offersData?.tabCounts?.rejected || 0})` },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => handleTabChange('offers', st.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeOfferSubTab === st.key
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="input text-xs py-1.5 w-40"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={conditionFilter}
                onChange={(e) => {
                  setConditionFilter(e.target.value);
                  setPage(1);
                }}
                className="input text-xs py-1.5 w-36"
              >
                <option value="">All Conditions</option>
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="broken">Broken / Repairable</option>
                <option value="for_parts">For Parts</option>
              </select>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input pl-9 text-xs py-1.5 w-full"
                placeholder="Search offer title or specs..."
              />
            </div>
          </div>

          {/* Offers Grid */}
          {offersLoading ? (
            <PageLoader />
          ) : offersData?.offers?.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No Donation Offers Found"
              description="No matching donor offers in this tab. Check other tabs or refine your category filters."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offersData?.offers?.map((offer) => {
                const cfg = DONATION_STATUS_CONFIG[offer.status] || DONATION_STATUS_CONFIG.draft;
                const matchAnalysis = offer.matchAnalysis;
                return (
                  <div
                    key={offer._id}
                    className="card p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all border border-gray-100"
                  >
                    <div className="space-y-3">
                      {/* Image & Match Badge */}
                      <div className="relative h-40 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                        {offer.item?.images?.length > 0 ? (
                          <img src={offer.item.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Heart className="w-12 h-12 text-pink-300" />
                        )}
                        {matchAnalysis && (
                          <button
                            onClick={() => setSelectedOfferForExplanation(offer)}
                            className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-600 text-white shadow-sm flex items-center gap-1 hover:bg-purple-700 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {matchAnalysis.totalScore}% Match
                          </button>
                        )}
                      </div>

                      {/* Header details */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="badge-blue text-[10px] truncate max-w-[150px]">
                            {offer.category?.name || 'Hardware'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mt-1.5 truncate">
                          {offer.title || offer.item?.title || 'Donated Device'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{offer.description}</p>
                      </div>

                      {/* Specs pills */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Condition:</span>
                          <strong className="capitalize">{offer.itemCondition}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Handover:</span>
                          <strong className="capitalize">{offer.preferredHandover}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Location:</span>
                          <span>{offer.approximateLocation || 'Local Area'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Quantity:</span>
                          <strong>{offer.quantity || 1} Unit(s)</strong>
                        </div>
                      </div>

                      {/* Safety or Data Bearing Warning */}
                      {offer.dataBearing?.isDataBearing && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Data-bearing device • Erasure required upon receipt</span>
                        </div>
                      )}
                    </div>

                    {/* Contextual Actions */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedOfferForExplanation(offer)}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Why Match?
                      </button>

                      <div className="flex items-center gap-1.5">
                        {offer.status === 'published' || offer.status === 'matched' ? (
                          <>
                            <button
                              onClick={() => {
                                setDecisionModalOffer(offer);
                                setDecisionAction('reject');
                                setDecisionReason('');
                                setDonorExplanation('');
                                setInternalNote('');
                              }}
                              className="btn-danger py-1 px-2.5 text-xs font-semibold"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => {
                                if (!isOrgVerified) {
                                  toast.error('You must have an Approved organization verification to accept donations.');
                                  return;
                                }
                                setDecisionModalOffer(offer);
                                setDecisionAction('accept');
                                setDecisionReason('');
                                setDonorExplanation('');
                                setInternalNote('');
                              }}
                              className="btn-primary py-1 px-3 text-xs font-semibold shadow-xs"
                            >
                              Accept Offer
                            </button>
                          </>
                        ) : offer.status === 'accepted' ? (
                          <button
                            onClick={() => {
                              setScheduleModalOffer(offer);
                              setScheduleDate('');
                              setScheduleMethod(offer.preferredHandover === 'pickup' ? 'pickup' : 'dropoff');
                            }}
                            className="btn-primary py-1 px-3 text-xs font-semibold"
                          >
                            <Truck className="w-3.5 h-3.5 inline mr-1" /> Schedule Handover
                          </button>
                        ) : offer.status === 'handover_scheduled' || offer.status === 'pickup_scheduled' ? (
                          <button
                            onClick={() => {
                              setReceiveModalOffer(offer);
                              setHandoverConfirmationCode('');
                            }}
                            className="btn-primary py-1 px-3 text-xs font-semibold bg-teal-600 hover:bg-teal-700"
                          >
                            <Package className="w-3.5 h-3.5 inline mr-1" /> Confirm Receipt
                          </button>
                        ) : offer.status === 'received' || offer.status === 'inspection_pending' ? (
                          <button
                            onClick={() => {
                              setInspectModalOffer(offer);
                              setInspectOutcome('accepted_working');
                              setInspectPublicNotes('');
                              setInspectInternalNotes('');
                            }}
                            className="btn-primary py-1 px-3 text-xs font-semibold bg-amber-600 hover:bg-amber-700"
                          >
                            <Wrench className="w-3.5 h-3.5 inline mr-1" /> Inspect Hardware
                          </button>
                        ) : offer.status === 'inspected' ? (
                          <button
                            onClick={() => {
                              setProcessModalOffer(offer);
                              setProcessOutcome('redistributed');
                              setProcessWeightKg(offer.estimatedWeight || 2.5);
                            }}
                            className="btn-primary py-1 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Recycle className="w-3.5 h-3.5 inline mr-1" /> Record Outcome
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-semibold">Processed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination pagination={offersData?.pagination} onPageChange={setPage} />
        </div>
      )}

      {/* TAB 2: COMMUNITY NEEDS */}
      {activeMainTab === 'needs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              Active Community Hardware Needs ({needsData?.needs?.length || 0})
            </h2>
            <button
              onClick={() => {
                if (!isOrgVerified) {
                  toast.error('Approved organization verification is required to publish community needs.');
                  return;
                }
                setShowNeedBuilder(true);
                setNeedStep(1);
              }}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Post New Need
            </button>
          </div>

          {needsLoading ? (
            <PageLoader />
          ) : needsData?.needs?.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No Community Needs Published"
              description="Publish a targeted request for laptops, medical devices, or appliances needed by your programs."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {needsData?.needs?.map((need) => (
                <div key={need._id} className="card p-5 space-y-3.5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="badge-blue text-[10px]">{need.category?.name || 'Category'}</span>
                    <span className="badge-gray text-[10px] uppercase font-bold">{need.urgency}</span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 truncate">{need.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{need.description}</p>

                  {/* Quantity Accounting Ledger Progress */}
                  <div className="space-y-1.5 text-xs bg-gray-50 p-3 rounded-xl">
                    <div className="flex items-center justify-between font-semibold text-gray-700">
                      <span>Target: {need.quantityRequested}</span>
                      <span>Received: {need.quantityReceived || 0}</span>
                      <span>Distributed: {need.quantityDistributed || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((need.quantityReceived || 0) / (need.quantityRequested || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Min Condition: {need.minimumCondition}</span>
                    <span>
                      Target Date: {need.targetDate ? new Date(need.targetDate).toLocaleDateString() : 'Ongoing'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination pagination={needsData?.pagination} onPageChange={setPage} />
        </div>
      )}

      {/* TAB 3: COLLECTIONS & LOGISTICS */}
      {activeMainTab === 'collections' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" /> Active Pickups & Hub Dropoffs
            </h2>
            <p className="text-xs text-gray-500">
              Manage incoming collections, confirm scheduled handovers, and verify donor handover confirmation codes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {(orgProfileData?.queues?.upcomingHandovers || []).map((h) => (
              <div key={h._id} className="card p-5 space-y-3 border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between">
                  <span className="badge-blue text-[10px] uppercase font-bold">
                    {h.handover?.method || 'Dropoff'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {h.handover?.scheduledDate
                      ? new Date(h.handover.scheduledDate).toLocaleDateString()
                      : 'Unscheduled'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">{h.title || h.item?.title || 'Donated Item'}</h3>
                <p className="text-xs text-gray-600">
                  Donor: <strong>{h.owner?.fullName}</strong> • Window: {h.handover?.timeWindow || '09:00 - 17:00'}
                </p>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setReceiveModalOffer(h);
                      setHandoverConfirmationCode('');
                    }}
                    className="btn-primary py-1 px-3 text-xs font-semibold shadow-xs"
                  >
                    Enter Confirmation Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INSPECTION BENCH */}
      {activeMainTab === 'inspection' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-2">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" /> Technical Inspection & Testing Bench
            </h2>
            <p className="text-xs text-gray-500">
              Complete mandatory physical safety, condition grading, and data-erasure checklists before marking items ready for community redistribution.
            </p>
          </div>

          <div className="space-y-3">
            {(orgProfileData?.queues?.itemsAwaitingInspection || []).map((item) => (
              <div key={item._id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge-yellow text-[10px]">Received at Hub</span>
                    <h3 className="text-sm font-bold text-gray-900">{item.title || item.item?.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Offered condition: <strong className="capitalize">{item.itemCondition}</strong> • Awaiting technical sign-off
                  </p>
                </div>

                <button
                  onClick={() => {
                    setInspectModalOffer(item);
                    setInspectOutcome('accepted_working');
                    setInspectPublicNotes('');
                    setInspectInternalNotes('');
                  }}
                  className="btn-primary py-1.5 px-3.5 text-xs font-semibold shrink-0 shadow-xs"
                >
                  Start Inspection Checklist
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: IMPACT LEDGER */}
      {activeMainTab === 'impact' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="card p-4">
              <span className="text-xs text-gray-500 font-medium">Total Items Processed</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {impactData?.impactSummary?.totalItemsProcessed || 0}
              </div>
            </div>
            <div className="card p-4">
              <span className="text-xs text-gray-500 font-medium">Measured Weight (kg)</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {impactData?.impactSummary?.measuredWeightKg || 0} kg
              </div>
            </div>
            <div className="card p-4">
              <span className="text-xs text-gray-500 font-medium">Estimated Weight (kg)</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {impactData?.impactSummary?.estimatedWeightKg || 0} kg
              </div>
            </div>
            <div className="card p-4">
              <span className="text-xs text-gray-500 font-medium">Replacement Value Saved</span>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                ৳{(impactData?.impactSummary?.totalReplacementValueSaved || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Audited Impact Table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 font-bold text-sm text-gray-900">
              Verified Processing Records & Environmental Impact Ledger
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Weight Method</th>
                    <th className="py-3 px-4">Waste Avoided</th>
                    <th className="py-3 px-4">Recorded Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {impactData?.records?.map((rec) => (
                    <tr key={rec._id} className="hover:bg-gray-50/70">
                      <td className="py-3 px-4 font-bold text-gray-900">{rec.item?.title || 'Processed Device'}</td>
                      <td className="py-3 px-4">
                        <span className="badge-blue capitalize text-[10px]">{rec.outcome?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3 px-4 capitalize font-mono text-[11px] text-gray-600">
                        {rec.weightMethod}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {rec.estimatedWasteAvoided || rec.measuredWeight} kg
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-[11px]">
                        {new Date(rec.recordedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HUBS & VERIFICATION */}
      {activeMainTab === 'hubs' && (
        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Collection Hubs & Dropoff Locations</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {hubs.map((hub) => (
                <div key={hub._id} className="p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-sm">{hub.name}</h3>
                    <span className={`badge-gray text-[10px] ${HUB_STATUS_CONFIG[hub.status]?.color}`}>
                      {HUB_STATUS_CONFIG[hub.status]?.label || hub.status}
                    </span>
                  </div>
                  <p className="text-gray-600">{hub.address}, {hub.city}</p>
                  <p className="text-gray-500 font-mono text-[11px]">Hours: {hub.operatingHours}</p>
                  <div className="text-gray-400 text-[10px]">
                    Capacity: {hub.capacityLimit || 50} units max
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MATCH EXPLANATION DRAWER */}
      {selectedOfferForExplanation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 space-y-5 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" /> Transparent Donation Matching Breakdown
                </h3>
                <p className="text-[11px] text-gray-500">{selectedOfferForExplanation.title || 'Donated Item'}</p>
              </div>
              <button onClick={() => setSelectedOfferForExplanation(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {selectedOfferForExplanation.matchAnalysis && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-center space-y-1">
                  <span className="text-xs font-bold text-purple-900">Total Match Score</span>
                  <div className="text-3xl font-extrabold text-purple-700">
                    {selectedOfferForExplanation.matchAnalysis.totalScore}%
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800 text-xs">Positive Match Factors:</h4>
                  {selectedOfferForExplanation.matchAnalysis.positiveMatches?.map((pm, i) => (
                    <div key={i} className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{pm}</span>
                    </div>
                  ))}
                </div>

                {selectedOfferForExplanation.matchAnalysis.unmetRequirements?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 text-xs">Unmet Criteria / Discrepancies:</h4>
                    {selectedOfferForExplanation.matchAnalysis.unmetRequirements.map((um, i) => (
                      <div key={i} className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{um}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800 text-xs">Physical Confirmation Requirements:</h4>
                  {selectedOfferForExplanation.matchAnalysis.physicalConfirmationRequired?.map((pc, i) => (
                    <div key={i} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 text-[11px] flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span>{pc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DECISION MODAL */}
      {decisionModalOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
            <h3 className="text-base font-bold text-gray-900 capitalize">
              {decisionAction} Donation Offer
            </h3>
            <p className="text-gray-600">
              Item: <strong>{decisionModalOffer.title || decisionModalOffer.item?.title}</strong>
            </p>

            {decisionAction === 'reject' && (
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Structured Rejection Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  className="input text-xs w-full"
                >
                  <option value="">Select reason...</option>
                  <option value="Outside supported item categories">Outside supported categories</option>
                  <option value="Storage capacity limit reached">Hub at full capacity</option>
                  <option value="Unable to service donor location">Location outside service radius</option>
                  <option value="Condition below refurbishment threshold">Condition unserviceable</option>
                  <option value="Hazardous safety flag">Safety hazard restriction</option>
                </select>
              </div>
            )}

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Donor-Facing Explanation Message
              </label>
              <textarea
                rows={2}
                value={donorExplanation}
                onChange={(e) => setDonorExplanation(e.target.value)}
                placeholder={decisionAction === 'accept' ? 'Thank you! We look forward to collecting this item.' : 'Reason for declining...'}
                className="input text-xs w-full"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Private Organization Internal Note
              </label>
              <input
                type="text"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Internal logistics / inventory tag..."
                className="input text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setDecisionModalOffer(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  decisionMutation.mutate({
                    id: decisionModalOffer._id,
                    payload: {
                      decision: decisionAction,
                      reason: decisionReason,
                      donorExplanation,
                      internalNote,
                      expectedVersion: decisionModalOffer.version,
                    },
                  })
                }
                disabled={decisionAction === 'reject' && !decisionReason}
                className={`btn-primary text-xs font-semibold ${
                  decisionAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''
                }`}
              >
                Confirm {decisionAction === 'accept' ? 'Acceptance' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HANDOVER SCHEDULING MODAL */}
      {scheduleModalOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-indigo-600" /> Schedule Collection Handover
            </h3>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Handover Method
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleMethod('dropoff')}
                  className={`btn-sm flex-1 font-bold ${
                    scheduleMethod === 'dropoff' ? 'bg-indigo-600 text-white' : 'btn-outline'
                  }`}
                >
                  Hub Dropoff
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMethod('pickup')}
                  className={`btn-sm flex-1 font-bold ${
                    scheduleMethod === 'pickup' ? 'bg-indigo-600 text-white' : 'btn-outline'
                  }`}
                >
                  Donor Pickup
                </button>
              </div>
            </div>

            {scheduleMethod === 'dropoff' && hubs.length > 0 && (
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Select Collection Hub
                </label>
                <select
                  value={scheduleHub}
                  onChange={(e) => setScheduleHub(e.target.value)}
                  className="input text-xs w-full"
                >
                  <option value="">Select a hub...</option>
                  {hubs.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Scheduled Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="input text-xs w-full"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Time Window
              </label>
              <select
                value={scheduleTimeWindow}
                onChange={(e) => setScheduleTimeWindow(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="09:00 - 13:00">Morning (09:00 - 13:00)</option>
                <option value="13:00 - 17:00">Afternoon (13:00 - 17:00)</option>
                <option value="17:00 - 20:00">Evening (17:00 - 20:00)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setScheduleModalOffer(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  scheduleMutation.mutate({
                    id: scheduleModalOffer._id,
                    payload: {
                      scheduledDate: scheduleDate,
                      timeWindow: scheduleTimeWindow,
                      method: scheduleMethod,
                      hubId: scheduleHub,
                      expectedVersion: scheduleModalOffer.version,
                    },
                  })
                }
                disabled={!scheduleDate || scheduleMutation.isPending}
                className="btn-primary text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
              >
                Generate Code & Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT CONFIRMATION MODAL */}
      {receiveModalOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-teal-600" /> Confirm Item Receipt at Hub
            </h3>
            <p className="text-gray-600">
              Verify donor handover confirmation code to acknowledge physical receipt.
            </p>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Donor Handover Code (6-digit alphanumeric)
              </label>
              <input
                type="text"
                value={handoverConfirmationCode}
                onChange={(e) => setHandoverConfirmationCode(e.target.value.toUpperCase())}
                placeholder="e.g. 8K2L9P"
                className="input text-base font-mono tracking-widest text-center uppercase w-full font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setReceiveModalOffer(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  receiveMutation.mutate({
                    id: receiveModalOffer._id,
                    confirmationCode: handoverConfirmationCode,
                  })
                }
                className="btn-primary text-xs font-semibold bg-teal-600 hover:bg-teal-700"
              >
                Verify & Acknowledge Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION CHECKLIST MODAL */}
      {inspectModalOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-amber-600" /> Technical Inspection Checklist
            </h3>

            <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inspectChecklist.itemIdentityVerified}
                  onChange={(e) =>
                    setInspectChecklist((c) => ({ ...c, itemIdentityVerified: e.target.checked }))
                  }
                  className="rounded text-primary-600"
                />
                <span className="font-semibold">Item model and make match donor description</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inspectChecklist.powerStateWorking}
                  onChange={(e) =>
                    setInspectChecklist((c) => ({ ...c, powerStateWorking: e.target.checked }))
                  }
                  className="rounded text-primary-600"
                />
                <span className="font-semibold">Powers on successfully with standard voltage</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inspectChecklist.functionalityTested}
                  onChange={(e) =>
                    setInspectChecklist((c) => ({ ...c, functionalityTested: e.target.checked }))
                  }
                  className="rounded text-primary-600"
                />
                <span className="font-semibold">Core functionality and screen/input diagnostics pass</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inspectChecklist.safetyClearance}
                  onChange={(e) =>
                    setInspectChecklist((c) => ({ ...c, safetyClearance: e.target.checked }))
                  }
                  className="rounded text-primary-600"
                />
                <span className="font-semibold">Safety clearance (no battery swelling, no exposed wiring)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inspectChecklist.dataComponentsChecked}
                  onChange={(e) =>
                    setInspectChecklist((c) => ({ ...c, dataComponentsChecked: e.target.checked }))
                  }
                  className="rounded text-primary-600"
                />
                <span className="font-semibold">Storage wiped / sanitized (NIST 800-88 compliance)</span>
              </label>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Inspection Outcome <span className="text-red-500">*</span>
              </label>
              <select
                value={inspectOutcome}
                onChange={(e) => setInspectOutcome(e.target.value)}
                className="input text-xs w-full"
              >
                {Object.entries(INSPECTION_OUTCOMES_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Public Donor Note</label>
              <input
                type="text"
                value={inspectPublicNotes}
                onChange={(e) => setInspectPublicNotes(e.target.value)}
                placeholder="Passed testing, ready for student laptop program..."
                className="input text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setInspectModalOffer(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  inspectMutation.mutate({
                    id: inspectModalOffer._id,
                    payload: {
                      checklist: inspectChecklist,
                      outcome: inspectOutcome,
                      publicNotes: inspectPublicNotes,
                      internalNotes: inspectInternalNotes,
                      expectedVersion: inspectModalOffer.version,
                    },
                  })
                }
                className="btn-primary text-xs font-semibold bg-amber-600 hover:bg-amber-700"
              >
                Submit Inspection Sign-off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESSING OUTCOME & IMPACT MODAL */}
      {processModalOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Recycle className="w-4 h-4 text-emerald-600" /> Record Final Outcome & Verified Impact
            </h3>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Final Processing Outcome <span className="text-red-500">*</span>
              </label>
              <select
                value={processOutcome}
                onChange={(e) => setProcessOutcome(e.target.value)}
                className="input text-xs w-full"
              >
                {Object.entries(PROCESSING_OUTCOMES_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Weight Method</label>
                <select
                  value={processWeightMethod}
                  onChange={(e) => setProcessWeightMethod(e.target.value)}
                  className="input text-xs w-full"
                >
                  <option value="measured">Measured (Scale)</option>
                  <option value="estimated">Estimated Average</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={processWeightKg}
                  onChange={(e) => setProcessWeightKg(Number(e.target.value))}
                  className="input text-xs w-full font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Replacement Value Saved (৳)
              </label>
              <input
                type="number"
                value={processReplacementCost}
                onChange={(e) => setProcessReplacementCost(Number(e.target.value))}
                className="input text-xs w-full font-bold"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Responsible Team / Program
              </label>
              <input
                type="text"
                value={processTeam}
                onChange={(e) => setProcessTeam(e.target.value)}
                className="input text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setProcessModalOffer(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  processMutation.mutate({
                    id: processModalOffer._id,
                    payload: {
                      outcome: processOutcome,
                      weightMethod: processWeightMethod,
                      measuredWeight: processWeightKg,
                      estimatedWeight: processWeightKg,
                      replacementValueEstimate: processReplacementCost,
                      team: processTeam,
                      expectedVersion: processModalOffer.version,
                    },
                  })
                }
                className="btn-primary text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
              >
                Verify Impact & Close Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5-STEP GUIDED COMMUNITY NEED BUILDER */}
      {showNeedBuilder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary-600" /> Post Community Hardware Need (Step {needStep} of 5)
              </h3>
              <button onClick={() => setShowNeedBuilder(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-5 gap-1 text-center font-bold text-[9px] uppercase tracking-wider text-gray-400">
              <div className={needStep >= 1 ? 'text-primary-600' : ''}>1. Basic</div>
              <div className={needStep >= 2 ? 'text-primary-600' : ''}>2. Specs</div>
              <div className={needStep >= 3 ? 'text-primary-600' : ''}>3. Program</div>
              <div className={needStep >= 4 ? 'text-primary-600' : ''}>4. Logistics</div>
              <div className={needStep >= 5 ? 'text-primary-600' : ''}>5. Publish</div>
            </div>

            {/* Step 1: Basic Info */}
            {needStep === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Need Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={needFormData.title}
                    onChange={(e) => setNeedFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. 10 Working Laptops for STEM Youth Center"
                    className="input text-xs w-full"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Item Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={needFormData.category}
                    onChange={(e) => setNeedFormData((p) => ({ ...p, category: e.target.value }))}
                    className="input text-xs w-full"
                    required
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Urgency</label>
                    <select
                      value={needFormData.urgency}
                      onChange={(e) => setNeedFormData((p) => ({ ...p, urgency: e.target.value }))}
                      className="input text-xs w-full"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical (Immediate Need)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Quantity Needed</label>
                    <input
                      type="number"
                      min="1"
                      value={needFormData.quantityRequested}
                      onChange={(e) => setNeedFormData((p) => ({ ...p, quantityRequested: Number(e.target.value) }))}
                      className="input text-xs w-full font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Item Specs */}
            {needStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Minimum Condition Acceptable</label>
                  <select
                    value={needFormData.minimumCondition}
                    onChange={(e) => setNeedFormData((p) => ({ ...p, minimumCondition: e.target.value }))}
                    className="input text-xs w-full"
                  >
                    <option value="good">Good (Fully functional)</option>
                    <option value="fair">Fair (Minor cosmetic wear)</option>
                    <option value="poor">Poor (Refurbishable)</option>
                    <option value="broken">Broken (Parts recovery)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Required Specifications / Notes</label>
                  <textarea
                    rows={3}
                    value={needFormData.requiredSpecifications}
                    onChange={(e) => setNeedFormData((p) => ({ ...p, requiredSpecifications: e.target.value }))}
                    placeholder="e.g. Core i3 or equivalent, 8GB RAM minimum, charging adapter preferred..."
                    className="input text-xs w-full"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Beneficiary Program */}
            {needStep === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Beneficiary & Program Context</label>
                  <textarea
                    rows={4}
                    value={needFormData.beneficiaryContext}
                    onChange={(e) => setNeedFormData((p) => ({ ...p, beneficiaryContext: e.target.value }))}
                    placeholder="General description: Laptops will be distributed to underprivileged students in the Mirpur coding initiative..."
                    className="input text-xs w-full"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Logistics */}
            {needStep === 4 && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Target Date</label>
                  <input
                    type="date"
                    value={needFormData.targetDate}
                    onChange={(e) => setNeedFormData((p) => ({ ...p, targetDate: e.target.value }))}
                    className="input text-xs w-full"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={needFormData.pickupAvailable}
                    onChange={(e) => setNeedFormData((p) => ({ ...p, pickupAvailable: e.target.checked }))}
                    className="rounded text-primary-600"
                  />
                  <span className="font-semibold">We can arrange volunteer pickup for bulk donations</span>
                </label>
              </div>
            )}

            {/* Step 5: Review & Publish */}
            {needStep === 5 && (
              <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-xs">
                <p>
                  <strong>Title:</strong> {needFormData.title}
                </p>
                <p>
                  <strong>Target Quantity:</strong> {needFormData.quantityRequested} units
                </p>
                <p>
                  <strong>Min Condition:</strong> {needFormData.minimumCondition}
                </p>
                <p>
                  <strong>Urgency:</strong> {needFormData.urgency.toUpperCase()}
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-3 border-t border-gray-100">
              {needStep > 1 ? (
                <button onClick={() => setNeedStep((s) => s - 1)} className="btn-secondary text-xs">
                  Back
                </button>
              ) : (
                <div />
              )}

              {needStep < 5 ? (
                <button
                  onClick={() => setNeedStep((s) => s + 1)}
                  disabled={needStep === 1 && (!needFormData.title || !needFormData.category)}
                  className="btn-primary text-xs font-semibold"
                >
                  Continue Next Step
                </button>
              ) : (
                <button
                  onClick={() =>
                    createNeedMutation.mutate({
                      ...needFormData,
                      requiredSpecifications: needFormData.requiredSpecifications
                        ? [needFormData.requiredSpecifications]
                        : [],
                    })
                  }
                  className="btn-primary text-xs font-semibold"
                >
                  Publish Community Need
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
