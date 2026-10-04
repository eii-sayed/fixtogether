import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  X,
  Package,
  Camera,
  Loader2,
  ChevronDown,
  Sparkles,
  Tag,
  Layers,
  CheckCircle2,
} from 'lucide-react';

const SUGGESTIONS = [
  '📱 Smartphone',
  '💻 Laptop',
  '🚲 Bicycle',
  '🔌 Microwave / Oven',
  '🎧 Headphones',
  '💨 Fan / Heater',
  '☕ Coffee Maker',
];

export default function QuickAddItemModal({ open, onClose, onItemCreated }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('good');

  // Categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data.categories),
  });

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

  const resetForm = () => {
    setTitle('');
    setCategoryId('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    setShowAdvanced(false);
    setBrand('');
    setModel('');
    setCondition('good');
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

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || title.trim().length < 3) {
        throw new Error('Please enter an item name (at least 3 characters)');
      }
      if (!categoryId) {
        throw new Error('Please select a category');
      }

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', categoryId);
      formData.append('condition', condition);
      formData.append('ownershipDeclaration', 'true');
      if (brand.trim()) formData.append('brand', brand.trim());
      if (model.trim()) formData.append('model', model.trim());
      if (image) formData.append('images', image);

      const resp = await api.post('/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return resp.data?.data?.item;
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries(['my-items']);
      queryClient.invalidateQueries(['my-items-all']);
      toast.success('🎉 Item added to My Items successfully!');
      if (onItemCreated) onItemCreated(newItem);
      handleClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to add item');
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50/50 via-white to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Quick Add Item</h2>
              <p className="text-xs text-gray-500">1-Step registration with essential details</p>
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
          {/* Quick suggestions */}
          <div>
            <label className="label text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Suggestions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((sug) => {
                const cleanName = sug.replace(/^[^a-zA-Z0-9]+/, '').trim();
                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setTitle(cleanName);
                      // Try auto-matching category if possible
                      if (categories && Array.isArray(categories)) {
                        const lower = cleanName.toLowerCase();
                        const match = categories.find((c) =>
                          lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower)
                        );
                        if (match) setCategoryId(match._id);
                      }
                    }}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-800 transition-colors border border-gray-200/60 active:scale-95"
                  >
                    {sug}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="label text-xs font-semibold text-gray-800" htmlFor="quick-item-title">
              Item Name / Model <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Tag className="w-4 h-4" />
              </span>
              <input
                id="quick-item-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Samsung Galaxy S21, Microwave, Trek Bike"
                className="input pl-10 text-sm font-medium"
                autoFocus
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label text-xs font-semibold text-gray-800" htmlFor="quick-item-cat">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Layers className="w-4 h-4" />
              </span>
              <select
                id="quick-item-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input pl-10 text-sm font-medium"
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

          {/* Photo (Compact 1-Tap) */}
          <div>
            <label className="label text-xs font-semibold text-gray-700">
              Photo <span className="text-gray-400 font-normal">(Optional)</span>
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
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
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
                className="w-full border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-2xl p-3.5 flex items-center justify-center gap-2.5 bg-gray-50/70 hover:bg-primary-50/30 transition-all text-xs font-semibold text-gray-600 hover:text-primary-700 active:scale-[0.99]"
              >
                <Camera className="w-4 h-4 text-primary-600" />
                <span>Tap to add photo or snap picture</span>
              </button>
            )}
          </div>

          {/* Advanced / Optional drawer */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors select-none"
            >
              <span>+ More details (Brand, Model, Condition)</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 animate-in fade-in-50 duration-150">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">Brand</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Apple, Sony"
                      className="input !py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">Model</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. A2337, S21"
                      className="input !py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Item Condition</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { val: 'good', label: 'Good', desc: 'Working' },
                      { val: 'fair', label: 'Fair', desc: 'Minor wear' },
                      { val: 'broken', label: 'Broken', desc: 'Needs repair' },
                    ].map((c) => (
                      <button
                        key={c.val}
                        type="button"
                        onClick={() => setCondition(c.val)}
                        className={`p-1.5 rounded-xl border text-center transition-all text-xs font-medium ${
                          condition === c.val
                            ? 'border-primary-500 bg-primary-50 text-primary-800 font-bold'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready in 1 click</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleClose} className="btn-outline btn-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={addMutation.isPending || !title.trim() || !categoryId}
              onClick={() => addMutation.mutate()}
              className="btn-primary btn-sm flex items-center gap-1.5 !px-5 shadow-xs"
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span>Add to My Items</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
