import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  X,
  Wrench,
  Camera,
  Loader2,
  ChevronDown,
  Sparkles,
  MapPin,
  Truck,
  Home,
  Monitor,
  ShieldCheck,
} from 'lucide-react';

const SYMPTOMS = [
  "Won't turn on / Dead",
  'Broken or cracked screen',
  'Battery draining / Not charging',
  'Water / liquid damage',
  'Strange noise or smoke',
  'Physical part broken / stuck',
  'Software / system error',
];

export default function QuickRepairModal({ open, onClose, item }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [problemDescription, setProblemDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [budget, setBudget] = useState('');
  const [serviceMethod, setServiceMethod] = useState('dropoff');

  const resetForm = () => {
    setProblemDescription('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    setShowAdvanced(false);
    setBudget('');
    setServiceMethod('dropoff');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddSymptom = (symptom) => {
    const curr = problemDescription.trim();
    if (!curr) {
      setProblemDescription(symptom);
    } else if (!curr.toLowerCase().includes(symptom.toLowerCase())) {
      setProblemDescription(`${curr}. ${symptom}`);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const desc = problemDescription.trim();
      if (!desc || desc.length < 5) {
        throw new Error('Please select a symptom or describe the issue (at least 5 characters)');
      }

      const formData = new FormData();
      formData.append('existingItemId', item._id);
      formData.append('problemDescription', desc);
      formData.append('autoPublish', 'true');
      formData.append('preferredServiceMethod', serviceMethod || 'dropoff');

      const numBudget = Number(budget);
      if (numBudget && numBudget > 0) {
        formData.append('budgetMaximum', String(numBudget));
      }

      if (image) {
        formData.append('images', image);
      }

      const { data } = await api.post('/repair-requests/quick', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data?.data?.repairRequest;
    },
    onSuccess: (newReq) => {
      queryClient.invalidateQueries(['my-items']);
      queryClient.invalidateQueries(['repair-requests']);
      queryClient.invalidateQueries(['dashboard-stats']);
      toast.success('🎉 Repair request published! Verified technicians have been notified.');
      handleClose();
      if (newReq?._id) {
        navigate(`/repair-requests/${newReq._id}`);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit repair request');
    },
  });

  if (!open || !item) return null;

  const itemImg = item.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Quick Repair Request</h2>
              <p className="text-xs text-gray-500">Pick the symptom and notify local technicians instantly</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Target Item summary badge */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
              {itemImg ? (
                <img src={itemImg} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <Wrench className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                  Item for Repair
                </span>
                {item.category?.name && (
                  <span className="text-[10px] text-gray-400">• {item.category.name}</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-900 truncate mt-0.5">{item.title}</h3>
            </div>
          </div>

          {/* 1-Click Symptom Chips */}
          <div>
            <label className="label text-xs font-semibold text-gray-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Issue / Symptom <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS.map((symptom) => {
                const isSelected = problemDescription.includes(symptom);
                return (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => handleAddSymptom(symptom)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-xl border transition-all active:scale-95 text-left flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-800 font-bold shadow-xs'
                        : 'border-gray-200/80 bg-gray-50/70 hover:bg-primary-50/40 text-gray-700'
                    }`}
                  >
                    <span>+</span>
                    <span>{symptom}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Problem description text */}
          <div>
            <label className="label text-xs font-semibold text-gray-800" htmlFor="quick-repair-desc">
              Description / Notes <span className="text-gray-400 font-normal">(Auto-fills above or type notes)</span>
            </label>
            <textarea
              id="quick-repair-desc"
              rows={3}
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="e.g. Device screen cracked after falling, touch still works partially..."
              className="input text-sm resize-none"
            />
          </div>

          {/* Optional damage photo */}
          <div>
            <label className="label text-xs font-semibold text-gray-700">
              Damage Photo <span className="text-gray-400 font-normal">(Optional, helps technicians quote accurately)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {imagePreview ? (
              <div className="relative inline-block rounded-2xl overflow-hidden border border-gray-200 group w-28 h-28 shadow-sm">
                <img src={imagePreview} alt="Damage Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/75 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-2xl p-3 flex items-center justify-center gap-2 bg-gray-50/70 hover:bg-primary-50/30 transition-all text-xs font-semibold text-gray-600 hover:text-primary-700 active:scale-[0.99]"
              >
                <Camera className="w-4 h-4 text-primary-600" />
                <span>Tap to attach photo of damage</span>
              </button>
            )}
          </div>

          {/* Optional Advanced Drawer (Budget & Service Method) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors select-none"
            >
              <span>+ Budget & Service Method (Optional)</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 animate-in fade-in-50 duration-150">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Service Method Preference
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { val: 'dropoff', label: 'Drop-off', icon: MapPin },
                      { val: 'pickup', label: 'Pick-up', icon: Truck },
                      { val: 'onsite', label: 'On-site', icon: Home },
                      { val: 'remote', label: 'Remote', icon: Monitor },
                    ].map((sm) => {
                      const Icon = sm.icon;
                      const active = serviceMethod === sm.val;
                      return (
                        <button
                          key={sm.val}
                          type="button"
                          onClick={() => setServiceMethod(sm.val)}
                          className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all ${
                            active
                              ? 'border-primary-500 bg-primary-50 text-primary-800 font-bold'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{sm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Max Target Budget (৳) (Optional)
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 1500 (Leave empty for open quotes)"
                    className="input !py-1.5 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auto-publishes to technicians</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleClose} className="btn-outline btn-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={submitMutation.isPending || !problemDescription.trim() || problemDescription.trim().length < 5}
              onClick={() => submitMutation.mutate()}
              className="btn-primary btn-sm flex items-center gap-1.5 !px-5 shadow-xs"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>Post Repair</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
