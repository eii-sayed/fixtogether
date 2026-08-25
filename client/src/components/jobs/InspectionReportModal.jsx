import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  X,
  Search,
  CheckSquare,
  AlertTriangle,
  Upload,
  FileText,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { CATEGORY_INSPECTION_CHECKLISTS } from '../../utils/technicianStatusConfig';

export default function InspectionReportModal({ open, onClose, repairJob }) {
  const queryClient = useQueryClient();

  const categoryName = (repairJob?.repairRequest?.item?.category?.name || 'electronics').toLowerCase();
  const defaultChecklist =
    CATEGORY_INSPECTION_CHECKLISTS[categoryName] ||
    CATEGORY_INSPECTION_CHECKLISTS.electronics ||
    CATEGORY_INSPECTION_CHECKLISTS.default;

  const [confirmedProblem, setConfirmedProblem] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [repairability, setRepairability] = useState('economic_repair');
  const [riskLevel, setRiskLevel] = useState('low');
  const [checklist, setChecklist] = useState(
    defaultChecklist.map((c) => ({ itemId: c.id, label: c.label, passed: true, notes: '' }))
  );
  const [confirmedLaborCost, setConfirmedLaborCost] = useState(repairJob?.acceptedQuotation?.laborCostMinimum || 500);
  const [confirmedPartsCost, setConfirmedPartsCost] = useState(repairJob?.acceptedQuotation?.partsEstimate || 0);
  const [ownerVisibleNotes, setOwnerVisibleNotes] = useState('');
  const [technicianPrivateNotes, setTechnicianPrivateNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitError, setSubmitError] = useState(null);

  const toggleChecklistItem = (index) => {
    setChecklist((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, passed: !item.passed } : item))
    );
  };

  const handleChecklistNoteChange = (index, text) => {
    setChecklist((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, notes: text } : item))
    );
  };

  const inspectionMutation = useMutation({
    mutationFn: (formData) =>
      api.post(`/repair-jobs/${repairJob._id}/inspection`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-job', repairJob._id] });
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['technician-workspace'] });
      onClose();
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.message || 'Failed to record inspection report.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError(null);

    const formData = new FormData();
    formData.append('confirmedProblem', confirmedProblem);
    formData.append('rootCause', rootCause);
    formData.append('repairability', repairability);
    formData.append('riskLevel', riskLevel);
    formData.append('checklistResults', JSON.stringify(checklist));
    formData.append('confirmedLaborCost', Number(confirmedLaborCost) || 0);
    formData.append('confirmedPartsCost', Number(confirmedPartsCost) || 0);
    formData.append('revisedTotalCost', (Number(confirmedLaborCost) || 0) + (Number(confirmedPartsCost) || 0));
    formData.append('ownerVisibleNotes', ownerVisibleNotes);
    formData.append('technicianPrivateNotes', technicianPrivateNotes);
    formData.append('repairFeasible', repairability === 'unfeasible' ? 'no' : 'yes');

    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }

    inspectionMutation.mutate(formData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
              Hardware Diagnostic Inspection
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-1">
              Job #{repairJob?._id?.slice(-6)} - {repairJob?.repairRequest?.item?.title || 'Item Inspection'}
            </h2>
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
          {/* Confirmed Issue & Root Cause */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirmed Hardware Issue *
              </label>
              <textarea
                rows={2}
                required
                value={confirmedProblem}
                onChange={(e) => setConfirmedProblem(e.target.value)}
                className="input-field"
                placeholder="Describe verified physical or electrical symptoms found during intake..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Underlying Root Cause *
              </label>
              <textarea
                rows={2}
                required
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="input-field"
                placeholder="e.g. Failed capacitor in primary filter rail, burned trace, cracked solder ball..."
              />
            </div>
          </div>

          {/* Repairability & Risk Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Repairability Assessment *
              </label>
              <select
                value={repairability}
                onChange={(e) => setRepairability(e.target.value)}
                className="input-field"
              >
                <option value="economic_repair">Economic Repair (Standard component fix)</option>
                <option value="minor_repair">Minor Repair (Quick turnaround)</option>
                <option value="major_overhaul">Major Overhaul (Multiple modules needed)</option>
                <option value="parts_only">Parts Recovery Only</option>
                <option value="unfeasible">Unfeasible / Beyond Economic Repair</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Safety Risk Level *
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="input-field"
              >
                <option value="low">Low Risk (Standard low voltage / mechanical)</option>
                <option value="medium">Medium Risk (Capacitor bank, thermal risk)</option>
                <option value="high">High Risk (Mains voltage / Li-ion battery)</option>
                <option value="critical">Critical (Hazardous fumes / fire risk)</option>
              </select>
            </div>
          </div>

          {/* Category Checklist */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 mb-3">
              <CheckSquare className="w-4 h-4 text-purple-600" />
              <span>Inspection Checklist ({categoryName})</span>
            </div>
            <div className="space-y-2.5">
              {checklist.map((item, idx) => (
                <div key={item.itemId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-gray-100">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.passed}
                      onChange={() => toggleChecklistItem(idx)}
                      className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <span>{item.label}</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Findings note (optional)"
                    value={item.notes}
                    onChange={(e) => handleChecklistNoteChange(idx, e.target.value)}
                    className="text-xs px-2.5 py-1 rounded border border-gray-200 focus:outline-none focus:border-primary-500 w-full sm:w-48"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Confirmed Cost Estimates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirmed Labor Cost (৳)
              </label>
              <input
                type="number"
                min="0"
                value={confirmedLaborCost}
                onChange={(e) => setConfirmedLaborCost(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirmed Parts Cost (৳)
              </label>
              <input
                type="number"
                min="0"
                value={confirmedPartsCost}
                onChange={(e) => setConfirmedPartsCost(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Notes (Separated Visibility) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Owner-Visible Inspection Notes
              </label>
              <textarea
                rows={2}
                value={ownerVisibleNotes}
                onChange={(e) => setOwnerVisibleNotes(e.target.value)}
                className="input-field"
                placeholder="Explanation of findings visible to the customer..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Technician Private Workshop Notes (Internal Only)
              </label>
              <textarea
                rows={2}
                value={technicianPrivateNotes}
                onChange={(e) => setTechnicianPrivateNotes(e.target.value)}
                className="input-field bg-amber-50/30"
                placeholder="Schematic pinouts, solder profiles, component sourcing URLs..."
              />
            </div>
          </div>

          {/* Photo Evidence Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Inspection Photo Evidence (Disassembly / Defect Macro)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
              className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
            />
            {selectedFiles.length > 0 && (
              <p className="text-[11px] text-green-600 mt-1 font-medium">
                {selectedFiles.length} photo(s) selected for upload.
              </p>
            )}
          </div>

          {submitError && (
            <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 font-medium">
              {submitError}
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary py-2 px-4 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={inspectionMutation.isPending}
              className="btn-primary py-2 px-6 text-xs font-semibold shadow-md shadow-primary-500/20"
            >
              {inspectionMutation.isPending ? 'Recording Inspection...' : 'Submit Inspection Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
