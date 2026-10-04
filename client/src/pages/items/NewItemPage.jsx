import { useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  X,
  Camera,
  Package,
  Sparkles,
  ChevronDown,
  Tag,
  Layers,
  Wrench,
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
  '🪑 Furniture / Chair',
];

export default function NewItemPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState([]);
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
      images.forEach((img) => formData.append('images', img.file));

      const resp = await api.post('/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return resp.data?.data?.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-items']);
      queryClient.invalidateQueries(['my-items-all']);
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      toast.success('🎉 Item added to My Items successfully!');
      navigate('/items');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to add item');
    },
  });

  return (
    <div className="page-container max-w-xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <Link
          to="/repair-requests/new"
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <Wrench className="w-3.5 h-3.5" /> Need repair instead?
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-500 text-white flex items-center justify-center shadow-md shadow-primary-600/20 shrink-0">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Add to My Items
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            1-Step registration. Only essential details needed.
          </p>
        </div>
      </div>

      {/* Main Single Form Card */}
      <div className="card p-5 sm:p-7 border border-gray-100 shadow-sm space-y-5">
        {/* Quick Suggestion Pills */}
        <div>
          <label className="label text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
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
                    if (categories && Array.isArray(categories)) {
                      const lower = cleanName.toLowerCase();
                      const match = categories.find((c) =>
                        lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower)
                      );
                      if (match) setCategoryId(match._id);
                    }
                  }}
                  className="text-xs font-medium px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-800 transition-colors border border-gray-200/60 active:scale-95"
                >
                  {sug}
                </button>
              );
            })}
          </div>
        </div>

        {/* Item Name / Title */}
        <div>
          <label className="label text-xs font-semibold text-gray-800" htmlFor="item-title">
            Item Name / Model <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Tag className="w-4 h-4" />
            </span>
            <input
              id="item-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Samsung Galaxy S21, Microwave, Trek Mountain Bike"
              className="input pl-10 text-sm font-medium"
              autoFocus
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="label text-xs font-semibold text-gray-800" htmlFor="item-category">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Layers className="w-4 h-4" />
            </span>
            <select
              id="item-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input pl-10 text-sm font-medium"
              disabled={loadingCategories}
            >
              <option value="">-- Select Category or Device Type --</option>
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

        {/* Photo Upload (1-Click Tap) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label text-xs font-semibold text-gray-800 m-0">
              Photos <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <span className="text-[11px] text-gray-400 font-medium">
              {images.length} / 5 photos
            </span>
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
              className="w-full border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-2xl p-4 flex items-center justify-center gap-2.5 bg-gray-50/70 hover:bg-primary-50/30 transition-all text-xs font-semibold text-gray-600 hover:text-primary-700 active:scale-[0.99]"
            >
              <Camera className="w-4 h-4 text-primary-600" />
              <span>Tap to take a picture or choose from gallery</span>
            </button>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 mt-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 group shadow-xs bg-gray-100"
                >
                  <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
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

        {/* Collapsible Optional Drawer (Brand, Model, Condition) */}
        <div className="pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors select-none py-1"
          >
            <span>+ Brand, Model & Condition (Optional)</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 animate-in fade-in-50 duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Apple, Sony, Giant"
                    className="input !py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. A2337, Series 8"
                    className="input !py-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Item Condition</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { val: 'new', label: 'New' },
                    { val: 'good', label: 'Good' },
                    { val: 'fair', label: 'Fair' },
                    { val: 'poor', label: 'Poor' },
                    { val: 'broken', label: 'Broken' },
                    { val: 'for_parts', label: 'Parts' },
                  ].map((c) => (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setCondition(c.val)}
                      className={`p-2 rounded-xl border text-center transition-all text-xs font-medium ${
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

        {/* 1-Click Submit Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={addMutation.isPending || !title.trim() || !categoryId}
            onClick={() => addMutation.mutate()}
            className="btn-primary w-full py-3.5 text-base font-bold shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 rounded-2xl active:scale-[0.99] transition-all"
          >
            {addMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Adding Item...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Add Item to My Items (1-Click)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
