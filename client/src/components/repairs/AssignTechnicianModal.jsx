import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  X,
  UserCheck,
  Search,
  Star,
  ShieldCheck,
  Wrench,
  Loader2,
  DollarSign,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function AssignTechnicianModal({
  open,
  onClose,
  repairRequest,
  quotations = [],
  initialSelectedTech = null,
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedTech, setSelectedTech] = useState(initialSelectedTech);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [note, setNote] = useState('');

  // Fetch matches / recommendations for this request
  const { data: matchesData, isLoading: loadingMatches } = useQuery({
    queryKey: ['repair-request-matches', repairRequest?._id],
    queryFn: () => api.get(`/repair-requests/${repairRequest?._id}/matches`).then((r) => r.data.data),
    enabled: open && !!repairRequest?._id,
  });

  // Fetch public technicians directory for search
  const { data: techsData, isLoading: loadingTechs } = useQuery({
    queryKey: ['technicians-search', search],
    queryFn: () => api.get(`/technicians?search=${search}&limit=12`).then((r) => r.data.data),
    enabled: open,
  });

  const matches = matchesData?.matches || [];
  const searchResults = techsData?.technicians || [];

  // Determine available technician candidates
  // 1. Matches with technician info
  // 2. Technicians from active quotations
  // 3. Technicians from directory search
  const candidatesMap = new Map();

  // Add quotation submitters first
  quotations.forEach((q) => {
    const tech = q.technician;
    if (tech && !candidatesMap.has(tech._id || tech)) {
      candidatesMap.set(tech._id || tech, {
        userId: tech._id || tech,
        fullName: tech.fullName,
        profileImage: tech.profileImage,
        quotation: q,
        source: 'quote',
      });
    }
  });

  // Add AI matches
  matches.forEach((m) => {
    const tech = m.technician;
    if (tech) {
      const id = tech._id || tech;
      const existing = candidatesMap.get(id);
      candidatesMap.set(id, {
        userId: id,
        fullName: tech.fullName,
        profileImage: tech.profileImage,
        skills: m.profile?.skills || [],
        rating: m.profile?.averageRating || 5.0,
        reviewCount: m.profile?.reviewCount || 0,
        matchScore: m.totalScore,
        experience: m.profile?.yearsOfExperience,
        quotation: existing?.quotation,
        source: existing ? 'quote_and_match' : 'match',
      });
    }
  });

  // Add directory search results
  searchResults.forEach((t) => {
    const id = t.userId || t._id;
    if (id && !candidatesMap.has(id)) {
      candidatesMap.set(id, {
        userId: id,
        fullName: t.fullName || t.professionalName,
        profileImage: t.profileImage,
        skills: t.skills || [],
        rating: t.averageRating || 5.0,
        reviewCount: t.reviewCount || 0,
        experience: t.yearsOfExperience,
        source: 'directory',
      });
    }
  });

  const candidateList = Array.from(candidatesMap.values()).filter((c) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      c.fullName?.toLowerCase().includes(query) ||
      c.skills?.some((s) => (s.name || s).toLowerCase().includes(query))
    );
  });

  // Direct Assign Mutation
  const assignMutation = useMutation({
    mutationFn: (payload) => api.post(`/repair-requests/${repairRequest?._id}/assign`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['repair-request', repairRequest?._id]);
      queryClient.invalidateQueries(['repair-requests']);
      queryClient.invalidateQueries(['quotations', repairRequest?._id]);
      queryClient.invalidateQueries(['repair-jobs', repairRequest?._id]);
      toast.success(res.data?.message || 'Technician assigned successfully!');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to assign technician');
    },
  });

  const handleConfirmAssignment = () => {
    if (!selectedTech) {
      toast.error('Please select a technician to assign.');
      return;
    }
    assignMutation.mutate({
      technicianId: selectedTech.userId,
      estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      note: note.trim() || undefined,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-50/70 to-emerald-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Assign Technician to Work</h2>
              <p className="text-xs text-gray-500 truncate max-w-md">
                For: <span className="font-semibold text-gray-700">{repairRequest?.item?.title || 'Repair Request'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search technician by name, expertise, or skill..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* List of Candidates */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              Available Specialists ({candidateList.length})
            </h3>

            {loadingMatches || loadingTechs ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <span className="text-xs">Loading verified specialists...</span>
              </div>
            ) : candidateList.length === 0 ? (
              <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100 p-4">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">No technicians found</p>
                <p className="text-xs text-gray-500 mt-0.5">Try searching with a different name or skill keyword.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {candidateList.map((c) => {
                  const isSelected = selectedTech?.userId === c.userId;

                  return (
                    <div
                      key={c.userId}
                      onClick={() => {
                        setSelectedTech(c);
                        if (c.quotation?.laborCostMinimum) {
                          setEstimatedCost(c.quotation.laborCostMinimum.toString());
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 shadow-inner">
                          {c.profileImage ? (
                            <img
                              src={c.profileImage}
                              alt={c.fullName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            c.fullName?.charAt(0) || 'T'
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-sm text-gray-900 truncate">{c.fullName}</h4>
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            {c.quotation && (
                              <span className="badge-blue text-[10px] font-bold py-0.5 px-2">
                                Quoted ৳{c.quotation.laborCostMinimum}–{c.quotation.laborCostMaximum}
                              </span>
                            )}
                            {c.matchScore && (
                              <span className="badge-green text-[10px] font-semibold py-0.5 px-2">
                                {c.matchScore}% Match
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {Number(c.rating || 5).toFixed(1)} ({c.reviewCount || 0})
                            </span>
                            {c.experience && <span>• {c.experience} yrs exp</span>}
                            {c.skills?.length > 0 && (
                              <span className="truncate max-w-[200px] text-gray-400">
                                • {c.skills.slice(0, 2).map((s) => s.name || s).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn-sm shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Technician Assignment Details */}
          {selectedTech && (
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-900">
                    Assigning: <span className="underline">{selectedTech.fullName}</span>
                  </span>
                </div>
                {selectedTech.quotation && (
                  <span className="text-xs text-emerald-700 font-semibold">
                    Linked to submitted quote #{selectedTech.quotation._id.slice(-6)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Agreed / Estimated Labor Cost (৳)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      placeholder="e.g. 800"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Special Instructions / Notes
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Customer prefers morning drop-off"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/80">
          <p className="text-xs text-gray-500">
            Assigning will create an active repair job and notify the technician.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost btn-sm text-gray-600">
              Cancel
            </button>
            <button
              onClick={handleConfirmAssignment}
              disabled={!selectedTech || assignMutation.isPending}
              className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm px-4"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" /> Confirm Assignment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
