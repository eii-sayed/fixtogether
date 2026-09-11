import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  Sparkles,
  ShieldCheck,
  Star,
  Send,
  UserCheck,
} from 'lucide-react';
import AssignTechnicianModal from '../../components/repairs/AssignTechnicianModal';

export default function RepairRequestMatchesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTechForAssign, setSelectedTechForAssign] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Fetch Repair Request Details
  const { data: requestData, isLoading: loadingRequest, error: requestError } = useQuery({
    queryKey: ['repair-request', id],
    queryFn: () => api.get(`/repair-requests/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const rr = requestData?.repairRequest;
  const currentUserId = (user?.userId || user?._id)?.toString();
  const isOwner = currentUserId && (currentUserId === (rr?.owner?._id || rr?.owner)?.toString());
  const isAdmin = user?.role === 'admin';
  const canManage = isOwner || isAdmin;

  // Fetch Matches
  const { data: matchesData, isLoading: loadingMatches } = useQuery({
    queryKey: ['repair-request-matches', id],
    queryFn: () => api.get(`/repair-requests/${id}/matches`).then((r) => r.data.data),
    enabled: !!id,
  });

  // Fetch Quotations to check who has already quoted
  const { data: quotesData } = useQuery({
    queryKey: ['quotations', id],
    queryFn: () => api.get(`/repair-requests/${id}/quotations`).then((r) => r.data.data),
    enabled: !!id,
  });

  const matches = matchesData?.matches || [];
  const quotations = quotesData?.quotations || [];

  // Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: (technicianId) =>
      api.post(`/repair-requests/${id}/invitations`, { technicianIds: [technicianId] }),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-request', id]);
      queryClient.invalidateQueries(['repair-request-matches', id]);
      toast.success('Invitation sent to technician!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    },
  });

  if (loadingRequest || loadingMatches) return <PageLoader />;
  if (requestError) return <ErrorState error={requestError} />;

  return (
    <div className="page-container max-w-5xl px-3 sm:px-6 py-6">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={() => navigate(`/repair-requests/${id}`)}
          className="btn-ghost btn-sm -ml-2 text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Request
        </button>
        <button
          onClick={() => setShowAssignModal(true)}
          className="btn-primary btn-sm flex items-center gap-1.5"
        >
          <UserCheck className="w-4 h-4" /> Assign Any Technician
        </button>
      </div>

      {/* Page Title & Context */}
      <div className="card p-5 sm:p-6 mb-6 bg-gradient-to-r from-primary-50/50 via-white to-emerald-50/50 border border-primary-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-bold text-primary-800 uppercase tracking-wider">
                Specialist Recommendations
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Technicians for: {rr?.item?.title || 'Repair Request'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Review verified specialists with category expertise. You can invite them to quote or assign directly.
            </p>
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      {matches.length === 0 ? (
        <div className="card p-12 text-center text-gray-500 space-y-3">
          <Users className="w-12 h-12 mx-auto text-gray-300" />
          <h3 className="text-base font-bold text-gray-800">No Matched Technicians Yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            You can search our full verified technician directory and directly assign someone to the job.
          </p>
          <button
            onClick={() => setShowAssignModal(true)}
            className="btn-primary btn-sm inline-flex items-center gap-1.5 mt-2"
          >
            <UserCheck className="w-4 h-4" /> Open Technician Directory
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((m) => {
            const tech = m.technician;
            const profile = m.profile;
            const techId = (tech?._id || tech)?.toString();
            const existingQuote = quotations.find(
              (q) => (q.technician?._id || q.technician)?.toString() === techId
            );
            const isInvited = rr?.selectedTechnicians?.some(
              (t) => (t.technician?._id || t.technician)?.toString() === techId
            );

            return (
              <div
                key={techId}
                className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between border border-gray-200/80"
              >
                <div>
                  {/* Top card bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 shadow-inner text-base">
                        {tech?.profileImage ? (
                          <img
                            src={tech.profileImage}
                            alt={tech.fullName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          tech?.fullName?.charAt(0) || 'T'
                        )}
                      </div>
                      <div>
                        <Link
                          to={`/technicians/${techId}`}
                          className="font-bold text-gray-900 hover:text-primary-600 flex items-center gap-1.5 text-base"
                        >
                          <span>{tech?.fullName}</span>
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1 font-semibold text-amber-600">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {Number(profile?.averageRating || 5).toFixed(1)} ({profile?.reviewCount || 0} reviews)
                          </span>
                          {profile?.yearsOfExperience && <span>• {profile.yearsOfExperience} yrs exp</span>}
                        </div>
                      </div>
                    </div>

                    {m.totalScore && (
                      <span className="badge-green font-bold text-xs shrink-0 py-1 px-2.5">
                        {m.totalScore}% Match
                      </span>
                    )}
                  </div>

                  {/* Bio snippet */}
                  {profile?.biography && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3 bg-gray-50 p-2 rounded-lg">
                      {profile.biography}
                    </p>
                  )}

                  {/* Skills tags */}
                  {profile?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {profile.skills.slice(0, 4).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium"
                        >
                          {s.name || s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Existing quote notice */}
                  {existingQuote && (
                    <div className="mb-3 p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-900">Submitted Quote:</span>
                      <span className="font-bold text-blue-700">
                        ৳{existingQuote.laborCostMinimum}–{existingQuote.laborCostMaximum}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/technicians/${techId}`}
                    className="btn-ghost btn-xs text-gray-600 hover:text-gray-900"
                  >
                    View Profile
                  </Link>

                  <div className="flex items-center gap-2">
                    {!isInvited && !existingQuote && canManage && (
                      <button
                        onClick={() => inviteMutation.mutate(techId)}
                        disabled={inviteMutation.isPending}
                        className="btn-outline btn-xs flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" /> Invite
                      </button>
                    )}

                    {canManage && !rr?.selectedQuotation && (
                      <button
                        onClick={() => {
                          setSelectedTechForAssign({
                            userId: techId,
                            fullName: tech?.fullName,
                            quotation: existingQuote,
                          });
                          setShowAssignModal(true);
                        }}
                        className="btn-primary btn-xs flex items-center gap-1 font-bold"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assign To Work
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Assign Modal */}
      {showAssignModal && (
        <AssignTechnicianModal
          open={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTechForAssign(null);
          }}
          repairRequest={rr}
          quotations={quotations}
          initialSelectedTech={selectedTechForAssign}
        />
      )}
    </div>
  );
}
