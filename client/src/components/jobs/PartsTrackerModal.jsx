import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  X,
  Package,
  Plus,
  Truck,
  CheckSquare,
  Clock,
  Search,
  RotateCcw,
  XCircle,
  PackageCheck,
  DollarSign,
} from 'lucide-react';
import { PART_STATUS_CONFIG } from '../../utils/technicianStatusConfig';

export default function PartsTrackerModal({ open, onClose, repairJob }) {
  const queryClient = useQueryClient();

  const [parts, setParts] = useState(repairJob?.requiredParts || []);
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);
  const [newPartCost, setNewPartCost] = useState(0);
  const [newPartSupplier, setNewPartSupplier] = useState('');
  const [editingPartIndex, setEditingPartIndex] = useState(null);
  const [partStatusUpdate, setPartStatusUpdate] = useState({
    status: 'ordered',
    actualCost: 0,
    expectedArrival: '',
    supplier: '',
    installationNote: '',
  });

  const [submitError, setSubmitError] = useState(null);

  // Add new part mutation
  const addPartMutation = useMutation({
    mutationFn: (newParts) =>
      api.post(`/repair-jobs/${repairJob._id}/parts`, { parts: newParts }).then((r) => r.data),
    onSuccess: (data) => {
      setParts(data.data?.repairJob?.requiredParts || []);
      setNewPartName('');
      setNewPartCost(0);
      setNewPartSupplier('');
      queryClient.invalidateQueries({ queryKey: ['repair-job', repairJob._id] });
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.message || 'Failed to add parts.');
    },
  });

  // Update specific part status mutation
  const updatePartMutation = useMutation({
    mutationFn: ({ index, payload }) =>
      api.patch(`/repair-jobs/${repairJob._id}/parts/${index}`, payload).then((r) => r.data),
    onSuccess: (data) => {
      setEditingPartIndex(null);
      queryClient.invalidateQueries({ queryKey: ['repair-job', repairJob._id] });
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.message || 'Failed to update part status.');
    },
  });

  const handleAddNewPart = (e) => {
    e.preventDefault();
    if (!newPartName.trim()) return;

    const newPart = {
      partName: newPartName,
      quantity: Number(newPartQty) || 1,
      estimatedCost: Number(newPartCost) || 0,
      supplier: newPartSupplier,
      status: 'required',
    };

    addPartMutation.mutate([newPart]);
  };

  const handleOpenEdit = (index, part) => {
    setEditingPartIndex(index);
    setPartStatusUpdate({
      status: part.status || 'required',
      actualCost: part.actualCost || part.estimatedCost || 0,
      expectedArrival: part.expectedArrival ? new Date(part.expectedArrival).toISOString().split('T')[0] : '',
      supplier: part.supplier || '',
      installationNote: part.installationNote || '',
    });
  };

  const handleSavePartStatus = (index) => {
    updatePartMutation.mutate({
      index,
      payload: partStatusUpdate,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Parts Procurement & Installation Tracking</h2>
              <p className="text-xs text-gray-500">Track part sourcing, deliveries, supplier logs, and install status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Current Parts List */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Required Components ({parts.length})
            </h3>

            {parts.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                <p className="text-xs text-gray-500 font-medium">No custom parts listed yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {parts.map((part, idx) => {
                  const statusConf = PART_STATUS_CONFIG[part.status] || PART_STATUS_CONFIG.required;
                  const isEditing = editingPartIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-white transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{part.partName}</span>
                            <span className="text-xs text-gray-500 font-medium">× {part.quantity}</span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusConf.badgeClass}`}>
                              {statusConf.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                            {part.supplier && <span>Supplier: {part.supplier}</span>}
                            <span>Est: ৳{part.estimatedCost || 0}</span>
                            {part.actualCost ? <span>Actual: ৳{part.actualCost}</span> : null}
                            {part.expectedArrival && (
                              <span>Arrival: {new Date(part.expectedArrival).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(idx, part)}
                            className="btn-secondary py-1 px-3 text-xs font-semibold"
                          >
                            Update Status
                          </button>
                        )}
                      </div>

                      {/* Inline Edit Form */}
                      {isEditing && (
                        <div className="p-3.5 bg-white rounded-xl border border-blue-200 space-y-3 mt-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                Part Status
                              </label>
                              <select
                                value={partStatusUpdate.status}
                                onChange={(e) =>
                                  setPartStatusUpdate((p) => ({ ...p, status: e.target.value }))
                                }
                                className="input-field text-xs py-1.5"
                              >
                                {Object.entries(PART_STATUS_CONFIG).map(([key, val]) => (
                                  <option key={key} value={key}>
                                    {val.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                Actual Purchase Cost (৳)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={partStatusUpdate.actualCost}
                                onChange={(e) =>
                                  setPartStatusUpdate((p) => ({ ...p, actualCost: e.target.value }))
                                }
                                className="input-field text-xs py-1.5"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                Expected Arrival Date
                              </label>
                              <input
                                type="date"
                                value={partStatusUpdate.expectedArrival}
                                onChange={(e) =>
                                  setPartStatusUpdate((p) => ({ ...p, expectedArrival: e.target.value }))
                                }
                                className="input-field text-xs py-1.5"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                Supplier / Merchant
                              </label>
                              <input
                                type="text"
                                value={partStatusUpdate.supplier}
                                onChange={(e) =>
                                  setPartStatusUpdate((p) => ({ ...p, supplier: e.target.value }))
                                }
                                className="input-field text-xs py-1.5"
                                placeholder="e.g. Stadium Market / Digikey"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Installation / Test Note
                            </label>
                            <input
                              type="text"
                              value={partStatusUpdate.installationNote}
                              onChange={(e) =>
                                setPartStatusUpdate((p) => ({ ...p, installationNote: e.target.value }))
                              }
                              className="input-field text-xs py-1.5"
                              placeholder="e.g. Replaced and confirmed 3.3V rail active"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingPartIndex(null)}
                              className="btn-secondary py-1 px-3 text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSavePartStatus(idx)}
                              disabled={updatePartMutation.isPending}
                              className="btn-primary py-1 px-4 text-xs font-semibold"
                            >
                              {updatePartMutation.isPending ? 'Saving...' : 'Save Part Status'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Part Sub-form */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
            <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-primary-600" />
              <span>Add Component / Material</span>
            </h4>
            <form onSubmit={handleAddNewPart} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Component name (e.g. MOSFET AON6414A)"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Quantity"
                    value={newPartQty}
                    onChange={(e) => setNewPartQty(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder="Estimated Cost (৳)"
                    value={newPartCost || ''}
                    onChange={(e) => setNewPartCost(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Supplier / Store (optional)"
                    value={newPartSupplier}
                    onChange={(e) => setNewPartSupplier(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={addPartMutation.isPending || !newPartName.trim()}
                  className="btn-primary py-1.5 px-4 text-xs font-semibold"
                >
                  {addPartMutation.isPending ? 'Adding...' : 'Add to Repair Job'}
                </button>
              </div>
            </form>
          </div>

          {submitError && (
            <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 font-medium">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end bg-gray-50/50">
          <button type="button" onClick={onClose} className="btn-secondary py-2 px-5 text-xs font-semibold">
            Close Parts Tracker
          </button>
        </div>
      </div>
    </div>
  );
}
