import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { PageLoader, ErrorState } from '../../components/ui';
import {
  Loader2,
  ArrowLeft,
  Upload,
  X,
  ImagePlus,
  Package,
  Save,
  Trash2,
} from 'lucide-react';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const schema = z.object({
  title: z.string().min(3, 'Item title must be at least 3 characters').max(200),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'broken', 'for_parts']),
  brand: z.string().optional(),
  model: z.string().optional(),
  approximateAgeValue: z.coerce.number().min(0).optional(),
  approximateAgeUnit: z.enum(['days', 'months', 'years']).optional(),
});

const conditions = [
  { value: 'broken', label: 'Broken', desc: 'Not working at all' },
  { value: 'poor', label: 'Poor', desc: 'Partially working, heavy wear' },
  { value: 'fair', label: 'Fair', desc: 'Working, visible wear' },
  { value: 'good', label: 'Good', desc: 'Working, minor wear' },
  { value: 'for_parts', label: 'For Parts', desc: 'Only useful for parts' },
  { value: 'new', label: 'New', desc: 'Unused / like new' },
];

export default function EditItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Item data
  const {
    data: itemData,
    isLoading: itemLoading,
    error: itemError,
  } = useQuery({
    queryKey: ['item', id],
    queryFn: () => api.get(`/items/${id}`).then((r) => r.data.data.item),
    enabled: !!id,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data.categories),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      category: '',
      condition: 'broken',
      brand: '',
      model: '',
      approximateAgeValue: 0,
      approximateAgeUnit: 'years',
    },
  });

  const selectedCondition = watch('condition');

  // Populate form with existing item values once loaded
  useEffect(() => {
    if (itemData) {
      reset({
        title: itemData.title || '',
        category: itemData.category?._id || itemData.category || '',
        condition: itemData.condition || 'broken',
        brand: itemData.brand || '',
        model: itemData.model || '',
        approximateAgeValue: itemData.approximateAge?.value || 0,
        approximateAgeUnit: itemData.approximateAge?.unit || 'years',
      });
      setExistingImages(itemData.images || []);
    }
  }, [itemData, reset]);

  // Image helpers
  const totalImageCount = existingImages.length + newImages.length;

  const validateAndAddFiles = (files) => {
    const filesArray = Array.from(files);
    const remaining = MAX_IMAGES - totalImageCount;

    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} photos allowed per item`);
      return;
    }

    const validFiles = [];
    for (const file of filesArray.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only JPEG, PNG, and WebP images are allowed`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File size must be under 5MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      const withPreviews = validFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }));
      setNewImages((prev) => [...prev, ...withPreviews]);
    }
  };

  const removeExistingImage = (indexToRemove) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const removeNewImage = (idToRemove) => {
    setNewImages((prev) => {
      const removed = prev.find((img) => img.id === idToRemove);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((img) => img.id !== idToRemove);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // 1. Update basic item fields & existing images list
      setStatusMessage('Saving item details...');
      const payload = {
        title: data.title,
        category: data.category,
        condition: data.condition,
        brand: data.brand || '',
        model: data.model || '',
        images: existingImages,
      };

      if (data.approximateAgeValue) {
        payload.approximateAge = {
          value: data.approximateAgeValue,
          unit: data.approximateAgeUnit,
        };
      }

      await api.patch(`/items/${id}`, payload);

      // 2. Upload any new images to Cloudinary
      if (newImages.length > 0) {
        setStatusMessage(`Uploading ${newImages.length} new photo(s)...`);
        const formData = new FormData();
        newImages.forEach((img) => formData.append('images', img.file));

        await api.post(`/items/${id}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Cleanup object URLs
      newImages.forEach((img) => URL.revokeObjectURL(img.preview));

      queryClient.invalidateQueries(['my-items']);
      queryClient.invalidateQueries(['item', id]);

      toast.success('Item updated successfully!');
      navigate('/items');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update item');
    } finally {
      setSaving(false);
      setStatusMessage('');
    }
  };

  if (itemLoading) return <PageLoader />;
  if (itemError) return <ErrorState error={itemError} />;

  const parentCategories = categories?.filter((c) => !c.parent) || [];

  return (
    <div className="page-container max-w-2xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Items
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-primary-600" />
          Edit Item
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Update item details, condition, or manage uploaded photos.
        </p>
      </div>

      <div className="card card-body">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="label" htmlFor="title">
              Item Title *
            </label>
            <input
              {...register('title')}
              id="title"
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g., Samsung Galaxy S21 - Cracked Screen"
            />
            {errors.title && <p className="error-text">{errors.title.message}</p>}
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="category">
                Category *
              </label>
              <select
                {...register('category')}
                id="category"
                className={`input ${errors.category ? 'input-error' : ''}`}
              >
                <option value="">Select category</option>
                {parentCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="error-text">{errors.category.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="brand">
                Brand
              </label>
              <input
                {...register('brand')}
                id="brand"
                className="input"
                placeholder="e.g., Samsung, Apple, Giant, Ikea"
              />
            </div>
          </div>

          {/* Model & Approximate Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="model">
                Model
              </label>
              <input
                {...register('model')}
                id="model"
                className="input"
                placeholder="e.g., Galaxy S21, Markus, Domane AL 2"
              />
            </div>
            <div>
              <label className="label">Approximate Age</label>
              <div className="flex gap-2">
                <input
                  {...register('approximateAgeValue')}
                  type="number"
                  className="input w-24"
                  placeholder="0"
                />
                <select {...register('approximateAgeUnit')} className="input flex-1">
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="label">Item Condition *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {conditions.map((c) => (
                <label
                  key={c.value}
                  className={`flex flex-col p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedCondition === c.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    {...register('condition')}
                    type="radio"
                    value={c.value}
                    className="sr-only"
                  />
                  <span
                    className={`text-sm font-semibold ${
                      selectedCondition === c.value ? 'text-primary-700' : 'text-gray-700'
                    }`}
                  >
                    {c.label}
                  </span>
                  <span className="text-[11px] text-gray-500 mt-0.5">{c.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* PHOTOS MANAGEMENT SECTION */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0 font-semibold text-gray-900">
                Item Photos ({totalImageCount} of {MAX_IMAGES})
              </label>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Add or remove photos of this item.
            </p>

            {/* Existing Photos */}
            {existingImages.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Current Photos:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {existingImages.map((img, idx) => (
                    <div
                      key={img.publicId || idx}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm"
                    >
                      <img
                        src={img.url}
                        alt="Item photo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Photos Upload Drop Zone */}
            {totalImageCount < MAX_IMAGES && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    validateAndAddFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <div className="flex flex-col items-center gap-1.5">
                  {dragOver ? (
                    <Upload className="w-7 h-7 text-primary-500 animate-bounce" />
                  ) : (
                    <ImagePlus className="w-7 h-7 text-primary-500" />
                  )}
                  <p className="text-sm font-semibold text-gray-800">
                    {dragOver ? 'Drop photos here' : 'Click to add more photos or drag & drop'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports JPG, PNG, WebP up to 5MB each ({MAX_IMAGES - totalImageCount} slots remaining)
                  </p>
                </div>
              </div>
            )}

            {/* Previews of newly selected photos */}
            {newImages.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-primary-700 mb-2">New Photos to Upload:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {newImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-primary-300 bg-gray-100 shadow-sm"
                    >
                      <img
                        src={img.preview}
                        alt="New photo preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(img.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-primary-600/80 py-0.5 px-1">
                        <p className="text-[9px] text-white truncate text-center font-medium">
                          New
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 !py-3 font-semibold flex items-center justify-center gap-2 shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusMessage || 'Saving changes...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
