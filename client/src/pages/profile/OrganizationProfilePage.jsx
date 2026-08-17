import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState } from '../../components/ui';
import {
  ArrowLeft,
  Building,
  ShieldCheck,
  Heart,
  Package,
  Recycle,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

export default function OrganizationProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: orgData, isLoading, error } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => api.get(`/organizations/${id}`).then((r) => r.data.data.organization),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const org = orgData;

  return (
    <div className="page-container max-w-5xl space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </button>

      {/* HEADER CARD */}
      <div className="card bg-white border overflow-hidden">
        <div className="h-32 sm:h-36 bg-gradient-to-r from-emerald-800 via-teal-900 to-primary-900" />

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 sm:-mt-16 gap-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-emerald-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-emerald-800 text-3xl font-bold">
                {org?.logo?.url ? (
                  <img src={org.logo.url} alt={org.organizationName} className="w-full h-full object-cover" />
                ) : (
                  org?.organizationName?.charAt(0) || 'O'
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{org?.organizationName}</h1>
                  {org?.verificationStatus === 'approved' && (
                    <span className="badge-green flex items-center gap-1 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Hub
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <span className="capitalize font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {org?.organizationType?.replace('_', ' ') || 'Community Organization'}
                  </span>
                  {org?.city && <span>• {org.city}</span>}
                  <span>• Active since {new Date(org?.memberSince).toLocaleDateString(undefined, { year: 'numeric' })}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/donations" className="btn-primary btn-sm flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-300" /> Donate Items
              </Link>
            </div>
          </div>

          {/* Impact Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-100">
            <div className="card card-body text-center bg-gray-50/50">
              <Heart className="w-5 h-5 text-rose-500 mx-auto mb-1" />
              <p className="font-extrabold text-xl text-gray-900">
                {org?.impactStats?.totalDonationsReceived || 0}
              </p>
              <p className="text-[11px] text-gray-500 font-medium">Donations Received</p>
            </div>

            <div className="card card-body text-center bg-gray-50/50">
              <Package className="w-5 h-5 text-primary-600 mx-auto mb-1" />
              <p className="font-extrabold text-xl text-gray-900">
                {org?.impactStats?.totalItemsProcessed || 0}
              </p>
              <p className="text-[11px] text-gray-500 font-medium">Items Distributed</p>
            </div>

            <div className="card card-body text-center bg-gray-50/50">
              <Recycle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="font-extrabold text-xl text-gray-900">
                {org?.impactStats?.totalWeightProcessed || 0} kg
              </p>
              <p className="text-[11px] text-gray-500 font-medium">E-Waste Diverted</p>
            </div>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Organization Details & Contact */}
        <div className="space-y-6">
          <div className="card card-body">
            <h3 className="font-bold text-gray-900 text-sm mb-2">About the Organization</h3>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
              {org?.description || 'Dedicated to community electronic repair, reuse, and safe recycling.'}
            </p>
          </div>

          <div className="card card-body space-y-3">
            <h3 className="font-bold text-gray-900 text-sm mb-2">Contact & Logistics</h3>
            {org.publicPhone && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{org.publicPhone}</span>
              </div>
            )}
            {org.publicEmail && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{org.publicEmail}</span>
              </div>
            )}
            {org.website && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Globe className="w-4 h-4 text-gray-400" />
                <a href={org.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                  {org.website}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Joined {new Date(org.memberSince).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Accepted vs Not Accepted & Collection Hubs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Accepted Items */}
          <div className="card card-body">
            <h3 className="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Accepted for Reuse & Repair
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {org.acceptedItemCategories?.length > 0 ? (
                org.acceptedItemCategories.map((cat, idx) => (
                  <span key={idx} className="badge-green text-xs font-semibold py-1 px-3">
                    {cat.name || cat}
                  </span>
                ))
              ) : (
                <span className="badge-green text-xs">All General Electronics</span>
              )}
            </div>
            {org.donationInstructions && (
              <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                <strong className="text-gray-700">Donation Instructions:</strong> {org.donationInstructions}
              </p>
            )}
          </div>

          {/* Hazardous / Not Accepted Items */}
          <div className="card card-body border-danger-100 bg-danger-50/20">
            <h3 className="font-bold text-danger-800 text-sm mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-danger-600" /> Prohibited & Hazardous Materials
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              We cannot accept leaking chemical containers, swollen or compromised lithium batteries, biohazards, or
              unregulated industrial equipment.
            </p>
          </div>

          {/* Collection Locations */}
          {org.locations?.length > 0 && (
            <div className="card card-body space-y-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-600" /> Drop-off & Collection Hubs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {org.locations.map((loc, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-bold text-xs text-gray-900">{loc.name}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{loc.address}</p>
                    {loc.operatingHours && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {loc.operatingHours}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
