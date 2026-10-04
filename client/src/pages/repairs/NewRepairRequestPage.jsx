import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  X,
  Camera,
  Wrench,
  Package,
  Sparkles,
  ChevronDown,
  Tag,
  Layers,
  MapPin,
  Truck,
  Home,
  Monitor,
  ShieldCheck,
  Plus,
} from 'lucide-react';

const QUICK_SYMPTOMS = [
  "Won't power on / dead",
  'Cracked screen / display issue',
  'Battery draining / not charging',
  'Water / liquid damage',
  'Overheating / shutting down',
  'Physical part broken / stuck',
  'Strange noise or vibration',
];

export default function NewRepairRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const initialItemId = searchParams.get('item') || '';

  // Data fetching
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data.categories),
  });

  const { data: itemsData } = useQuery({
    queryKey: ['my-items-all'],
    queryFn: () => api.get('/items?limit=100').then((r) => r.data.data),
  });

  const existingItems = itemsData?.items || [];

  // State
  const [selectedItemId, setSelectedItemId] = useState(initialItemId);
  const [isNewItem, setIsNewItem] = useState(!initialItemId && existingItems.length === 0);

  // When existingItems load, if no initialItemId and user has items, pick the first or keep new
  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
      setIsNewItem(false);
    }
  }, [initialItemId]);

  // New item fields
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Repair fields
  const [problemDescription, setProblemDescription] = useState('');
  const [images, setImages] = useState([]);

  // Optional drawer
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [serviceMethod, setServiceMethod] = useState('dropoff');
  const [budget, setBudget] = useState('');

  // Group categories
  const categoryGroups = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return [];
    const parents = categories.filter((c) => !c.parent);
    return parents.map((parent) => {
      const children = categories.filter((c) => {
        const pId = c.parent?._id || c.parent;
        return pId && String(pId) === String(parent._id);
      });
      return { parent, children };
    });
  }, [categories]);

  const handleAddSymptom = (symptom) => {
    const curr = problemDescription.trim();
    if (!curr) {
      setProblemDescription(symptom);
    } else if (!curr.toLowerCase().includes(symptom.toLowerCase())) {
      setProblemDescription(`${curr}. ${symptom}`);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toast.error('Maximum 5 photos allowed');
      return;
    }

    const valid = [];
    for (const f of files.slice(0, remaining)) {
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name}: Only images allowed`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: Size must be under 5MB`);
        continue;
      }
      valid.push({
        file: f,
        preview: URL.createObjectURL(f),
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
    }

    if (valid.length > 0) {
      setImages((prev) => [...prev, ...valid]);
    }
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const found = prev.find((img) => img.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return prev.filter((img) => img.id !== id);
    });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const desc = problemDescription.trim();
      if (!desc || desc.length < 5) {
        throw new Error('Please select a symptom or describe the issue in at least 5 characters');
      }

      const formData = new FormData();
      if (!isNewItem && selectedItemId) {
        formData.append('existingItemId', selectedItemId);
      } else {
        if (!newTitle.trim() || newTitle.trim().length < 3) {
          throw new Error('Please enter the item name (at least 3 characters)');
        }
        if (!newCategory) {
          throw new Error('Please select a category for the item');
        }
        formData.append('title', newTitle.trim());
        formData.append('category', newCategory);
        formData.append('condition', 'broken');
        formData.append('ownershipDeclaration', 'true');
      }

      formData.append('problemDescription', desc);
      formData.append('autoPublish', 'true');
      if (serviceMethod) formData.append('preferredServiceMethod', serviceMethod);

      const numBudget = Number(budget);
      if (numBudget && numBudget > 0) {
        formData.append('budgetMaximum', String(numBudget));
      }

      images.forEach((img) => formData.append('images', img.file));

      const { data } = await api.post('/repair-requests/quick', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data?.data?.repairRequest;
    },
    onSuccess: (newReq) => {
      queryClient.invalidateQueries(['my-items']);
      queryClient.invalidateQueries(['repair-requests']);
      queryClient.invalidateQueries(['dashboard-stats']);
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      toast.success('🎉 Repair request submitted & published to local technicians!');
      if (newReq?._id) {
        navigate(`/repair-requests/${newReq._id}`);
      } else {
        navigate('/repair-requests');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit repair request');
    },
  });

  return (
    <div className="page-container max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header & Back Link */}
      <div>
        <Link
          to="/repair-requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Requests
        </Link>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-primary-600/20 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Request a Repair
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              1-Step, 1-Click posting. Verified technicians receive your request immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Main Single-Step Card */}
      <div className="card p-5 sm:p-7 border border-gray-100 shadow-sm space-y-6">
        {/* Item Selection (1-Tap Chips) */}
        <div>
          <label className="label text-xs font-bold text-gray-900 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary-600" />
              Item to Repair <span className="text-red-500">*</span>
            </span>
            {existingItems.length > 0 && (
              <span className="text-[11px] text-gray-400 font-normal">
                Tap your item or add a new one
              </span>
            )}
          </label>

          {existingItems.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {existingItems.map((item) => {
                  const isSelected = !isNewItem && selectedItemId === item._id;
                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item._id);
                        setIsNewItem(false);
                      }}
                      className={`px-3 py-2 rounded-2xl border text-left transition-all flex items-center gap-2 text-xs font-semibold active:scale-95 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-xs ring-1 ring-primary-500'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Package className={`w-3.5 h-3.5 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className="truncate max-w-[160px]">{item.title}</span>
                    </button>
                  );
                })}

                {/* + New Item Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setIsNewItem(true);
                    setSelectedItemId('');
                  }}
                  className={`px-3 py-2 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95 ${
                    isNewItem
                      ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-xs ring-1 ring-primary-500'
                      : 'border-dashed border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-primary-600" />
                  <span>+ Different / New Item</span>
                </button>
              </div>

              {/* If New Item selected, show 2 simple inline inputs */}
              {isNewItem && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 animate-in fade-in-50 duration-150">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Item Name / Device <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <Tag className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="e.g. MacBook Pro M1, iPhone 12"
                          className="input pl-9 !py-2 text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          <Layers className="w-3.5 h-3.5" />
                        </span>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="input pl-9 !py-2 text-xs font-medium"
                          disabled={loadingCategories}
                        >
                          <option value="">-- Choose Category --</option>
                          {categoryGroups.map((group) => (
                            <optgroup key={group.parent._id} label={group.parent.name}>
                              <option value={group.parent._id}>All {group.parent.name} (General)</option>
                              {group.children.map((c) => (
                                <option key={c._id} value={c._id}>
                                  &nbsp;&nbsp;• {c.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // No existing items: direct 2 inputs
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Item Name / Device <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Tag className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Samsung 55in TV, MacBook, Trek Bike"
                    className="input pl-10 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Layers className="w-4 h-4" />
                  </span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="input pl-10 text-sm font-medium"
                    disabled={loadingCategories}
                  >
                    <option value="">-- Select Category --</option>
                    {categoryGroups.map((group) => (
                      <optgroup key={group.parent._id} label={group.parent.name}>
                        <option value={group.parent._id}>All {group.parent.name} (General)</option>
                        {group.children.map((c) => (
                          <option key={c._id} value={c._id}>
                            &nbsp;&nbsp;• {c.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Problem & 1-Click Symptoms */}
        <div className="pt-2 border-t border-gray-100">
          <label className="label text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            What is the problem? <span className="text-red-500">*</span>
          </label>

          {/* 1-Click Symptom Chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_SYMPTOMS.map((symptom) => {
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

          <textarea
            rows={3}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Tap a symptom chip above or type details here (e.g. Screen cracked after falling, won't turn on...)"
            className="input text-sm resize-none"
          />
        </div>

        {/* Photos (1-Click Tap) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <label className="label text-xs font-bold text-gray-900 m-0 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-primary-600" />
              Photos <span className="text-gray-400 font-normal">(Optional, helps technicians quote)</span>
            </label>
            <span className="text-[11px] text-gray-400 font-medium">{images.length} / 5 photos</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />

          {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-2xl p-3.5 flex items-center justify-center gap-2.5 bg-gray-50/70 hover:bg-primary-50/30 transition-all text-xs font-semibold text-gray-600 hover:text-primary-700 active:scale-[0.99]"
            >
              <Camera className="w-4 h-4 text-primary-600" />
              <span>Tap to attach photo of item / damage</span>
            </button>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 mt-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 group shadow-xs bg-gray-100"
                >
                  <img src={img.preview} alt="Damage" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Collapsible Optional Preferences (Budget & Service Method) */}
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors select-none py-1"
          >
            <span>+ Service Method & Budget (Optional)</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 animate-in fade-in-50 duration-150">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Preferred Service Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 'dropoff', label: 'Drop-off', desc: 'I bring item', icon: MapPin },
                    { val: 'pickup', label: 'Pick-up', desc: 'Technician collects', icon: Truck },
                    { val: 'onsite', label: 'On-site', desc: 'Home repair', icon: Home },
                    { val: 'remote', label: 'Remote', desc: 'Online advice', icon: Monitor },
                  ].map((sm) => {
                    const Icon = sm.icon;
                    const active = serviceMethod === sm.val;
                    return (
                      <button
                        key={sm.val}
                        type="button"
                        onClick={() => setServiceMethod(sm.val)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          active
                            ? 'border-primary-500 bg-primary-50 text-primary-900 font-bold shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{sm.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{sm.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Estimated Maximum Budget (৳) <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                    ৳
                  </span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 1500 (Leave blank for open quotes)"
                    className="input pl-8 !py-2 text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ownership banner & 1-Click Submit Button */}
        <div className="pt-2 space-y-3">
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>By posting, your request is immediately shared with verified local technicians.</span>
          </div>

          <button
            type="button"
            disabled={
              submitMutation.isPending ||
              !problemDescription.trim() ||
              problemDescription.trim().length < 5 ||
              (isNewItem && (!newTitle.trim() || !newCategory)) ||
              (!isNewItem && !selectedItemId && existingItems.length > 0)
            }
            onClick={() => submitMutation.mutate()}
            className="btn-primary w-full py-3.5 text-base font-bold shadow-md shadow-primary-500/25 flex items-center justify-center gap-2 rounded-2xl active:scale-[0.99] transition-all"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Publishing Request & Notifying Technicians...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
                <span>Publish Repair Request (1-Click)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
