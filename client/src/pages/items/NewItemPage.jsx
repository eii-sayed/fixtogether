import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Upload, X, ImagePlus } from 'lucide-react';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'broken', 'for_parts']),
  brand: z.string().optional(),
  model: z.string().optional(),
  approximateAgeValue: z.coerce.number().min(0).optional(),
  approximateAgeUnit: z.enum(['days', 'months', 'years']).optional(),
  ownershipDeclaration: z.boolean().refine(val => val === true, 'You must declare ownership'),
});

const conditions = [
  { value: 'new', label: 'New', desc: 'Unused, in original packaging' },
  { value: 'good', label: 'Good', desc: 'Working, minor cosmetic wear' },
  { value: 'fair', label: 'Fair', desc: 'Working, visible wear' },
  { value: 'poor', label: 'Poor', desc: 'Partially working, significant wear' },
  { value: 'broken', label: 'Broken', desc: 'Not working at all' },
  { value: 'for_parts', label: 'For Parts', desc: 'Only useful for spare parts' },
];

export default function NewItemPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data.categories),
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { condition: 'broken', approximateAgeUnit: 'years', ownershipDeclaration: false },
  });

  const selectedCondition = watch('condition');

  // Image handling
  const validateAndAddFiles = (files) => {
    const newFiles = Array.from(files);
    const remaining = MAX_IMAGES - selectedImages.length;

    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const validFiles = [];
    for (const file of newFiles.slice(0, remaining)) {
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
      const withPreviews = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }));
      setSelectedImages(prev => [...prev, ...withPreviews]);
    }
  };

  const removeImage = (id) => {
    setSelectedImages(prev => {
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // 1. Create the item
      const payload = {
        title: data.title, category: data.category, condition: data.condition,
        brand: data.brand || undefined, model: data.model || undefined,
        ownershipDeclaration: data.ownershipDeclaration,
      };
      if (data.approximateAgeValue) {
        payload.approximateAge = { value: data.approximateAgeValue, unit: data.approximateAgeUnit };
      }
      const { data: resp } = await api.post('/items', payload);
      const itemId = resp.data.item._id;

      // 2. Upload images if any were selected
      if (selectedImages.length > 0) {
        setUploadProgress('Uploading images...');
        const formData = new FormData();
        selectedImages.forEach(img => formData.append('images', img.file));

        await api.post(`/items/${itemId}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Cleanup previews
      selectedImages.forEach(img => URL.revokeObjectURL(img.preview));

      toast.success('Item added successfully!');
      navigate(`/repair-requests/new?item=${itemId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add item');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const parentCategories = categories?.filter(c => !c.parent) || [];

  return (
    <div className="page-container max-w-2xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Item</h1>

      <div className="card card-body">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="label" htmlFor="title">Item Title *</label>
            <input {...register('title')} id="title" className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g., Samsung Galaxy S21 - Cracked Screen" />
            {errors.title && <p className="error-text">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="category">Category *</label>
              <select {...register('category')} id="category" className={`input ${errors.category ? 'input-error' : ''}`}>
                <option value="">Select category</option>
                {parentCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              {errors.category && <p className="error-text">{errors.category.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="brand">Brand</label>
              <input {...register('brand')} id="brand" className="input" placeholder="e.g., Samsung" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="model">Model</label>
              <input {...register('model')} id="model" className="input" placeholder="e.g., Galaxy S21" />
            </div>
            <div>
              <label className="label">Approximate Age</label>
              <div className="flex gap-2">
                <input {...register('approximateAgeValue')} type="number" className="input w-20" placeholder="0" />
                <select {...register('approximateAgeUnit')} className="input flex-1">
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Condition *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {conditions.map((c) => (
                <label key={c.value}
                  className={`flex flex-col p-3 border-2 rounded-xl cursor-pointer transition-all ${selectedCondition === c.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input {...register('condition')} type="radio" value={c.value} className="sr-only" />
                  <span className={`text-sm font-medium ${selectedCondition === c.value ? 'text-primary-700' : 'text-gray-700'}`}>{c.label}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{c.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="label">Photos</label>
            <p className="text-xs text-gray-500 mb-3">
              Add up to {MAX_IMAGES} photos of your item. Supported: JPEG, PNG, WebP (max 5MB each)
            </p>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              } ${selectedImages.length >= MAX_IMAGES ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  validateAndAddFiles(e.target.files);
                  e.target.value = ''; // Reset so same file can be selected again
                }}
              />
              <div className="flex flex-col items-center gap-2">
                {dragOver ? (
                  <Upload className="w-8 h-8 text-primary-500 animate-bounce" />
                ) : (
                  <ImagePlus className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {dragOver ? 'Drop images here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedImages.length}/{MAX_IMAGES} images selected
                  </p>
                </div>
              </div>
            </div>

            {/* Image Previews */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                {selectedImages.map((img) => (
                  <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    <img
                      src={img.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent p-1">
                      <p className="text-[9px] text-white truncate text-center">
                        {img.file.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input {...register('ownershipDeclaration')} type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700">I declare that I am the rightful owner of this item and have the authority to submit it for repair, donation, or recycling. *</span>
            </label>
            {errors.ownershipDeclaration && <p className="error-text mt-1">{errors.ownershipDeclaration.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress || 'Adding...'}
              </>
            ) : (
              `Add Item${selectedImages.length > 0 ? ` with ${selectedImages.length} Photo${selectedImages.length !== 1 ? 's' : ''}` : ''} & Continue`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
