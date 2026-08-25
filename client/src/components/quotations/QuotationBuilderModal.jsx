import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  X,
  Sparkles,
  DollarSign,
  Clock,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Info,
  Wrench,
  Package,
} from 'lucide-react';

const STEPS = [
  { id: 'review', label: '1. Review Request' },
  { id: 'pricing', label: '2. Pricing' },
  { id: 'terms', label: '3. Terms & Warranty' },
  { id: 'technical', label: '4. Technical Notes' },
  { id: 'submit', label: '5. Review & Submit' },
];

export default function QuotationBuilderModal({
  open,
  onClose,
  repairRequest,
  existingQuotation = null,
}) {
  const queryClient = useQueryClient();
  const storageKey = `fixtogether_quote_draft_${repairRequest?._id}`;

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    inspectionFee: 0,
    laborCostMinimum: 500,
    laborCostMaximum: 800,
    partsEstimate: 0,
    transportFee: 0,
    otherCosts: 0,
    expectedDurationValue: 3,
    expectedDurationUnit: 'days',
    warrantyDays: 30,
    conditions: 'Standard workmanship warranty against identical fault recurrence.',
    exclusions: 'Excludes accidental drop damage, liquid ingress after repair, or tampering by third parties.',
    preliminaryAssessment: '',
    proposedApproach: '',
    possibleParts: '',
    risksAndUncertainties: '',
    technicianNotes: '',
  });

  const [submitError, setSubmitError] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);

  // Restore draft or populate existing quotation
  useEffect(() => {
    if (!open) return;
    if (existingQuotation) {
      setFormData({
        inspectionFee: existingQuotation.inspectionFee || 0,
        laborCostMinimum: existingQuotation.laborCostMinimum || 0,
        laborCostMaximum: existingQuotation.laborCostMaximum || 0,
        partsEstimate: existingQuotation.partsEstimate || 0,
        transportFee: existingQuotation.transportFee || 0,
        otherCosts: existingQuotation.otherCosts || 0,
        expectedDurationValue: existingQuotation.expectedDuration?.value || 3,
        expectedDurationUnit: existingQuotation.expectedDuration?.unit || 'days',
        warrantyDays: existingQuotation.warrantyDays || 30,
        conditions: existingQuotation.conditions || '',
        exclusions: existingQuotation.exclusions || '',
        preliminaryAssessment: existingQuotation.preliminaryAssessment || '',
        proposedApproach: existingQuotation.proposedApproach || '',
        possibleParts: existingQuotation.possibleParts || '',
        risksAndUncertainties: existingQuotation.risksAndUncertainties || '',
        technicianNotes: existingQuotation.technicianNotes || '',
      });
    } else {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          setFormData((prev) => ({ ...prev, ...JSON.parse(saved) }));
          setDraftSaved(true);
        }
      } catch (e) {
        // ignore storage error
      }
    }
  }, [open, existingQuotation, storageKey]);

  // Autosave draft to sessionStorage on change
  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (!existingQuotation) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(updated));
          setDraftSaved(true);
        } catch (e) {
          // ignore
        }
      }
      return updated;
    });
  };

  // Live total calculations
  const inspectionFeeNum = Math.max(0, Number(formData.inspectionFee) || 0);
  const laborMinNum = Math.max(0, Number(formData.laborCostMinimum) || 0);
  const laborMaxNum = Math.max(laborMinNum, Number(formData.laborCostMaximum) || laborMinNum);
  const partsNum = Math.max(0, Number(formData.partsEstimate) || 0);
  const transportNum = Math.max(0, Number(formData.transportFee) || 0);
  const otherNum = Math.max(0, Number(formData.otherCosts) || 0);

  const totalMin = inspectionFeeNum + laborMinNum + partsNum + transportNum + otherNum;
  const totalMax = inspectionFeeNum + laborMaxNum + partsNum + transportNum + otherNum;

  const maxBudget = repairRequest?.budget?.maximum || 0;
  const exceedsBudget = maxBudget > 0 && totalMax > maxBudget;

  const submitMutation = useMutation({
    mutationFn: (payload) => {
      if (existingQuotation) {
        return api.post(`/quotations/${existingQuotation._id}/revise`, payload).then((r) => r.data);
      }
      return api.post(`/repair-requests/${repairRequest._id}/quotations`, payload).then((r) => r.data);
    },
    onSuccess: () => {
      sessionStorage.removeItem(storageKey);
      queryClient.invalidateQueries({ queryKey: ['repair-request', repairRequest?._id] });
      queryClient.invalidateQueries({ queryKey: ['repair-requests'] });
      queryClient.invalidateQueries({ queryKey: ['technician-workspace'] });
      onClose();
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.message || 'Failed to submit quotation. Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError(null);

    const payload = {
      inspectionFee: inspectionFeeNum,
      laborCostMinimum: laborMinNum,
      laborCostMaximum: laborMaxNum,
      partsEstimate: partsNum,
      transportFee: transportNum,
      otherCosts: otherNum,
      expectedDuration: {
        value: Number(formData.expectedDurationValue) || 1,
        unit: formData.expectedDurationUnit,
      },
      warrantyDays: Number(formData.warrantyDays) || 30,
      conditions: formData.conditions,
      technicianNotes: [
        formData.preliminaryAssessment ? `Assessment: ${formData.preliminaryAssessment}` : '',
        formData.proposedApproach ? `Approach: ${formData.proposedApproach}` : '',
        formData.possibleParts ? `Parts: ${formData.possibleParts}` : '',
        formData.risksAndUncertainties ? `Risks: ${formData.risksAndUncertainties}` : '',
        formData.technicianNotes,
      ]
        .filter(Boolean)
        .join('\n\n'),
    };

    submitMutation.mutate(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary-100 text-primary-700">
                {existingQuotation ? 'Quotation Revision' : 'Quotation Proposal'}
              </span>
              {draftSaved && !existingQuotation && (
                <span className="text-[11px] text-gray-400 font-medium">Draft auto-saved</span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 mt-1">
              {repairRequest?.item?.title || 'Repair Quotation Builder'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="grid grid-cols-5 border-b border-gray-100 bg-white px-4 py-2 gap-1">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setStep(idx)}
              className={`text-left py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                step === idx
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : step > idx
                  ? 'text-green-600 hover:bg-gray-50'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1">
                {step > idx ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[9px] shrink-0 font-bold">
                    {idx + 1}
                  </span>
                )}
                <span className="truncate hidden sm:inline">{s.label.split('. ')[1]}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 0: Review Request */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Reported Problem Description</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {repairRequest?.problemDescription || 'No description provided.'}
                </p>
                {repairRequest?.eventBeforeIssue && (
                  <div className="mt-3 text-xs text-gray-600">
                    <span className="font-semibold text-gray-700">Preceding event:</span> {repairRequest.eventBeforeIssue}
                  </div>
                )}
              </div>

              {repairRequest?.aiAnalysis && (
                <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-1.5 text-purple-700 font-semibold text-xs mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Preliminary Diagnostic Findings (Advisory)</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs text-purple-900">
                    <div>
                      <span className="font-medium text-purple-700">Possible Inspection Areas:</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-purple-800">
                        {(repairRequest.aiAnalysis.possibleIssues || ['Standard component diagnosis']).slice(0, 3).map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Estimated Complexity:</span>
                      <p className="mt-1 capitalize text-purple-800 font-semibold">
                        {repairRequest.aiAnalysis.estimatedComplexity || 'Moderate'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-800">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Owner's Target Budget:{' '}
                    <strong>৳{repairRequest?.budget?.minimum || 0} - ৳{repairRequest?.budget?.maximum || 'Flexible'}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-blue-600 font-medium">
                  Service Method: {repairRequest?.preferredServiceMethod || 'Standard'}
                </span>
              </div>
            </div>
          )}

          {/* STEP 1: Pricing Breakdown */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Inspection Fee (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.inspectionFee}
                    onChange={(e) => handleChange('inspectionFee', e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Diagnostic benching fee (deductible upon repair).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estimated Parts Cost (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.partsEstimate}
                    onChange={(e) => handleChange('partsEstimate', e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Estimated hardware component cost.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Labor Charge Min (৳) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.laborCostMinimum}
                    onChange={(e) => handleChange('laborCostMinimum', e.target.value)}
                    className="input-field"
                    placeholder="500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Labor Charge Max (৳) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.laborCostMaximum}
                    onChange={(e) => handleChange('laborCostMaximum', e.target.value)}
                    className="input-field"
                    placeholder="800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pickup / Delivery Transport (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.transportFee}
                    onChange={(e) => handleChange('transportFee', e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Other Incidental Fees (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.otherCosts}
                    onChange={(e) => handleChange('otherCosts', e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 bg-primary-50/70 rounded-xl border border-primary-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-primary-700">Calculated Estimated Total Range</span>
                  <div className="text-xl font-extrabold text-primary-900 mt-0.5">
                    ৳{totalMin.toLocaleString()} – ৳{totalMax.toLocaleString()}
                  </div>
                </div>
                {exceedsBudget && (
                  <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100/80 px-2.5 py-1.5 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Exceeds owner budget (৳{maxBudget})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Terms & Warranty */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estimated Turnaround Duration *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={formData.expectedDurationValue}
                      onChange={(e) => handleChange('expectedDurationValue', e.target.value)}
                      className="input-field w-24 shrink-0"
                    />
                    <select
                      value={formData.expectedDurationUnit}
                      onChange={(e) => handleChange('expectedDurationUnit', e.target.value)}
                      className="input-field flex-1"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Warranty Duration (Days) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.warrantyDays}
                    onChange={(e) => handleChange('warrantyDays', e.target.value)}
                    className="input-field"
                    placeholder="30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Warranty Coverage Scope
                </label>
                <textarea
                  rows={2}
                  value={formData.conditions}
                  onChange={(e) => handleChange('conditions', e.target.value)}
                  className="input-field"
                  placeholder="What is covered under this repair warranty..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Warranty Exclusions
                </label>
                <textarea
                  rows={2}
                  value={formData.exclusions}
                  onChange={(e) => handleChange('exclusions', e.target.value)}
                  className="input-field"
                  placeholder="Accidental drop damage, liquid ingress, etc..."
                />
              </div>
            </div>
          )}

          {/* STEP 3: Technical Notes */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Preliminary Technical Assessment
                </label>
                <textarea
                  rows={2}
                  value={formData.preliminaryAssessment}
                  onChange={(e) => handleChange('preliminaryAssessment', e.target.value)}
                  className="input-field"
                  placeholder="Your initial assessment of the root cause based on symptoms..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Proposed Repair Approach & Technique
                </label>
                <textarea
                  rows={2}
                  value={formData.proposedApproach}
                  onChange={(e) => handleChange('proposedApproach', e.target.value)}
                  className="input-field"
                  placeholder="SMD rework, component swap, firmware flash, re-soldering..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Potential Replacement Parts Needed
                  </label>
                  <input
                    type="text"
                    value={formData.possibleParts}
                    onChange={(e) => handleChange('possibleParts', e.target.value)}
                    className="input-field"
                    placeholder="e.g. MOSFET, IC chip, capacitors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Risks & Uncertainties (if any)
                  </label>
                  <input
                    type="text"
                    value={formData.risksAndUncertainties}
                    onChange={(e) => handleChange('risksAndUncertainties', e.target.value)}
                    className="input-field"
                    placeholder="e.g. Delamination risk, proprietary components"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Direct Note to Owner
                </label>
                <textarea
                  rows={2}
                  value={formData.technicianNotes}
                  onChange={(e) => handleChange('technicianNotes', e.target.value)}
                  className="input-field"
                  placeholder="Friendly message or special instructions for the customer..."
                />
              </div>
            </div>
          )}

          {/* STEP 4: Review & Submit */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Estimated Pricing Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    ৳{totalMin.toLocaleString()} – ৳{totalMax.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Inspection Fee: ৳{inspectionFeeNum}</div>
                  <div>Parts Estimate: ৳{partsNum}</div>
                  <div>Labor Range: ৳{laborMinNum} – ৳{laborMaxNum}</div>
                  <div>Transport / Other: ৳{transportNum + otherNum}</div>
                  <div>Turnaround: {formData.expectedDurationValue} {formData.expectedDurationUnit}</div>
                  <div>Warranty: {formData.warrantyDays} Days</div>
                </div>
              </div>

              {exceedsBudget && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Budget Consideration:</span> Your maximum quote (৳{totalMax}) is above the owner's target budget (৳{maxBudget}). Providing clear technical notes helps justify quality components and warranty value.
                  </div>
                </div>
              )}

              {submitError && (
                <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 font-medium">
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="btn-primary py-2 px-6 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-500/20"
            >
              {submitMutation.isPending ? 'Submitting Proposal...' : existingQuotation ? 'Submit Revised Quotation' : 'Submit Quotation Proposal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
