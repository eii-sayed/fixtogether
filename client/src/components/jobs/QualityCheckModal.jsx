import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  X,
  CheckSquare,
  Award,
  Upload,
  PackageCheck,
  DollarSign,
  FileCheck,
} from 'lucide-react';
import { QUALITY_CHECK_ITEMS } from '../../utils/technicianStatusConfig';

export default function QualityCheckModal({ open, onClose, repairJob }) {
  const queryClient = useQueryClient();

  const [checklist, setChecklist] = useState(
    QUALITY_CHECK_ITEMS.map((item) => ({ itemId: item.id, title: item.title, description: item.description, verified: true, notes: '' }))
  );
  const [completionReport, setCompletionReport] = useState('');
  const [replacedParts, setReplacedParts] = useState('');
  const [finalLaborCost, setFinalLaborCost] = useState(repairJob?.finalLaborCost || repairJob?.acceptedQuotation?.laborCostMinimum || 500);
  const [finalPartsCost, setFinalPartsCost] = useState(repairJob?.finalPartsCost || repairJob?.acceptedQuotation?.partsEstimate || 0);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitError, setSubmitError] = useState(null);

  const toggleCheck = (idx) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, verified: !item.verified } : item))
    );
  };

  const handleNotesChange = (idx, text) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, notes: text } : item))
    );
  };

  const allVerified = checklist.every((c) => c.verified);

  const qaMutation = useMutation({
    mutationFn: (formData) =>
      api.post(`/repair-jobs/${repairJob._id}/quality-check`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-job', repairJob._id] });
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['technician-workspace'] });
      onClose();
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.message || 'Failed to submit quality check report.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allVerified) {
      setSubmitError('All quality check verification criteria must be verified before marking ready for collection.');
      return;
    }
    setSubmitError(null);

    const formData = new FormData();
    formData.append('qualityChecks', JSON.stringify(checklist));
    formData.append('completionReport', completionReport);
    formData.append('replacedParts', replacedParts);
    formData.append('finalLaborCost', Number(finalLaborCost) || 0);
    formData.append('finalPartsCost', Number(finalPartsCost) || 0);
    formData.append('paymentMethod', paymentMethod);

    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }

    qaMutation.mutate(formData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Pre-Handover Quality Check & Verification</h2>
              <p className="text-xs text-gray-500">Device verification before notifying owner for collection</p>
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
          {/* Quality Criteria Checklist */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Mandatory Quality Assurance Criteria *
            </label>
            {checklist.map((item, idx) => (
              <div
                key={item.itemId}
                className={`p-3 rounded-xl border transition-all ${
                  item.verified
                    ? 'bg-purple-50/40 border-purple-200'
                    : 'bg-gray-50 border-gray-200 opacity-80'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={item.verified}
                    onChange={() => toggleCheck(idx)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-900">{item.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{item.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Completion Report */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Final Completion Summary Report *
            </label>
            <textarea
              rows={3}
              required
              value={completionReport}
              onChange={(e) => setCompletionReport(e.target.value)}
              className="input-field"
              placeholder="Describe repairs performed, replaced components, final bench test results, and any usage instructions for the owner..."
            />
          </div>

          {/* Replaced Components */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Replaced Components / Parts List
            </label>
            <input
              type="text"
              value={replacedParts}
              onChange={(e) => setReplacedParts(e.target.value)}
              className="input-field"
              placeholder="e.g. 1x 100uF Nichicon Capacitor, 1x Thermal Paste Noctua NT-H1"
            />
          </div>

          {/* Final Financials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Final Labor Cost (৳) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={finalLaborCost}
                onChange={(e) => setFinalLaborCost(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Final Parts Cost (৳) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={finalPartsCost}
                onChange={(e) => setFinalPartsCost(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Final Total Badge */}
          <div className="p-3.5 bg-green-50 rounded-xl border border-green-200 flex items-center justify-between">
            <span className="text-xs font-medium text-green-800">Final Billable Total:</span>
            <span className="text-base font-extrabold text-green-900">
              ৳{((Number(finalLaborCost) || 0) + (Number(finalPartsCost) || 0)).toLocaleString()}
            </span>
          </div>

          {/* Completed Work Photos */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Completed Device & Working Bench Photos
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
              className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
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
              disabled={qaMutation.isPending || !allVerified}
              className="btn-primary py-2 px-6 text-xs font-semibold shadow-md shadow-primary-500/20"
            >
              {qaMutation.isPending ? 'Verifying...' : 'Pass QA & Mark Ready for Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
