import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  X,
  AlertCircle,
  DollarSign,
  Upload,
  Calendar,
  Wrench,
  Package,
} from 'lucide-react';

export default function CostApprovalModal({ open, onClose, repairJob }) {
  const queryClient = useQueryClient();

  const originalTotal = repairJob?.finalTotalCost || repairJob?.acceptedQuotation?.estimatedTotalMaximum || 0;
  const [newlyDiscoveredIssue, setNewlyDiscoveredIssue] = useState('');
  const [reason, setReason] = useState('hidden_damage');
  const [additionalLabor, setAdditionalLabor] = useState(0);
  const [additionalParts, setAdditionalParts] = useState(0);
  const [additionalDays, setAdditionalDays] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitError, setSubmitError] = useState(null);

  const revisedTotal = originalTotal + (Number(additionalLabor) || 0) + (Number(additionalParts) || 0);

  const costApprovalMutation = useMutation({
    mutationFn: (formData) =>
      api.post(`/repair-jobs/${repairJob._id}/cost-approval`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-job', repairJob._id] });
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['technician-workspace'] });
      onClose();
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.message || 'Failed to submit cost approval request.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError(null);

    const formData = new FormData();
    formData.append('originalTotal', originalTotal);
    formData.append('revisedTotal', revisedTotal);
    formData.append('additionalLabor', Number(additionalLabor) || 0);
    formData.append('additionalParts', Number(additionalParts) || 0);
    formData.append('additionalDays', Number(additionalDays) || 0);
    formData.append('newlyDiscoveredIssue', newlyDiscoveredIssue);
    formData.append('reason', reason);
    formData.append('explanation', explanation);

    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }

    costApprovalMutation.mutate(formData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-8 border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Request Additional-Cost Approval</h2>
              <p className="text-xs text-gray-500">Requires explicit owner acceptance before work can proceed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Issue & Non-detectable reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Newly Discovered Fault / Condition *
            </label>
            <textarea
              rows={2}
              required
              value={newlyDiscoveredIssue}
              onChange={(e) => setNewlyDiscoveredIssue(e.target.value)}
              className="input-field"
              placeholder="e.g. Uncovered secondary short circuit under shielded BGA package during microscopic inspection..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Why was this not detectable during preliminary quotation? *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field"
            >
              <option value="hidden_damage">Hidden Internal Damage (Only visible upon microscopic disassembly)</option>
              <option value="cascade_failure">Cascade Component Failure (Failed primary IC destroyed sub-circuit)</option>
              <option value="corrosion_spread">Trace Delamination / Extensive Liquid Oxidation</option>
              <option value="obsolete_component_sourcing">Component Discontinued (Requires alternative carrier board)</option>
            </select>
          </div>

          {/* Additional Cost Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Additional Parts Cost (৳)
              </label>
              <input
                type="number"
                min="0"
                value={additionalParts}
                onChange={(e) => setAdditionalParts(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Additional Labor Cost (৳)
              </label>
              <input
                type="number"
                min="0"
                value={additionalLabor}
                onChange={(e) => setAdditionalLabor(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Turnaround Extension */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Additional Estimated Days Required
            </label>
            <input
              type="number"
              min="0"
              value={additionalDays}
              onChange={(e) => setAdditionalDays(e.target.value)}
              className="input-field"
              placeholder="1"
            />
          </div>

          {/* Financial Comparison Summary Box */}
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between text-xs text-amber-800 pb-2 border-b border-amber-200/60">
              <span>Original Accepted Quote:</span>
              <span className="font-semibold">৳{originalTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-amber-800 py-1">
              <span>Additional Costs (+):</span>
              <span className="font-semibold">৳{((Number(additionalParts) || 0) + (Number(additionalLabor) || 0)).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-amber-950 pt-2 border-t border-amber-200 font-bold">
              <span>Proposed Revised Total:</span>
              <span className="text-base text-primary-700 font-extrabold">৳{revisedTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Explanation to Owner */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Detailed Technical Explanation to Owner *
            </label>
            <textarea
              rows={3}
              required
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="input-field"
              placeholder="Explain why this work is critical to guarantee repair safety and warranty longevity..."
            />
          </div>

          {/* Photo Evidence */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Photo Evidence of Hidden Damage
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
              className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
            />
          </div>

          {submitError && (
            <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 font-medium">
              {submitError}
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary py-2 px-4 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={costApprovalMutation.isPending}
              className="btn-primary py-2 px-6 text-xs font-semibold shadow-md shadow-primary-500/20"
            >
              {costApprovalMutation.isPending ? 'Submitting Request...' : 'Send Cost Approval to Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
