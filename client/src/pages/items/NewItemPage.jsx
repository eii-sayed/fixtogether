import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Upload,
  X,
  ImagePlus,
  Package,
  Wrench,
  Camera,
} from 'lucide-react';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const schema = z.object({
  title: z.string().min(3, 'Item title must be at least 3 characters').max(200),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'broken', 'for_parts']),
  brand: z.string().optional(),
  model: z.string().optional(),
  approximateAgeValue: z.coerce.number().min(0).optional(),
  approximateAgeUnit: z.enum(['days', 'months', 'years']).optional(),
  ownershipDeclaration: z.boolean().refine((val) => val === true, {
    message: 'You must declare ownership of the item',
  }),

  // Optional direct repair request fields
  createRepairRequest: z.boolean().default(true),
  problemDescription: z.string().optional(),
  eventBeforeIssue: z.string().optional(),
  budgetMinimum: z.coerce.number().min(0).optional(),
  budgetMaximum: z.coerce.number().min(0).optional(),
  preferredServiceMethod: z.enum(['onsite', 'pickup', 'dropoff', 'remote', '']).optional(),
}).superRefine((data, ctx) => {
  if (data.createRepairRequest) {
    if (!data.problemDescription || data.problemDescription.trim().length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please describe the problem in at least 20 characters',
        path: ['problemDescription'],
      });
    }
  }
});

const conditions = [
  { value: 'broken', label: 'Broken', desc: 'Not working at all' },
  { value: 'poor', label: 'Poor', desc: 'Partially working, heavy wear' },
  { value: 'fair', label: 'Fair', desc: 'Working, visible wear' },
  { value: 'good', label: 'Good', desc: 'Working, minor wear' },
  { value: 'for_parts', label: 'For Parts', desc: 'Only useful for parts' },
  { value: 'new', label: 'New', desc: 'Unused / like new' },
];

export default function NewItemPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data.categories),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      condition: 'broken',
      approximateAgeUnit: 'years',
      ownershipDeclaration: false,
      createRepairRequest: true,
      preferredServiceMethod: '',
    },
  });

  const selectedCondition = watch('condition');
  const wantRepairRequest = watch('createRepairRequest');

  // Photo handlers
  const validateAndAddFiles = (files) => {
    const newFiles = Array.from(files);
    const remaining = MAX_IMAGES - selectedImages.length;

    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} photos allowed`);
      return;
    }

    const validFiles = [];
    for (const file of newFiles.slice(0, remaining)) {
      if (file.type && !file.type.startsWith('image/')) {
        toast.error(`${file.name}: Only image files are allowed`);
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
      setSelectedImages((prev) => [...prev, ...withPreviews]);
    }
  };

  const removeImage = (id) => {
    setSelectedImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((img) => img.id !== id);
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
    setLoading(true);
    try {
      // 1. Create the item
      setStatusMessage('Creating item...');
      const itemPayload = {
        title: data.title,
        category: data.category,
        condition: data.condition,
        brand: data.brand || undefined,
        model: data.model || undefined,
        ownershipDeclaration: data.ownershipDeclaration,
      };
      if (data.approximateAgeValue) {
        itemPayload.approximateAge = {
          value: data.approximateAgeValue,
          unit: data.approximateAgeUnit,
        };
      }

      const { data: itemResp } = await api.post('/items', itemPayload);
      const itemId = itemResp.data.item._id;

      // 2. Upload images to Cloudinary
      if (selectedImages.length > 0) {
        setStatusMessage(`Uploading ${selectedImages.length} photo(s)...`);
        const formData = new FormData();
        selectedImages.forEach((img) => formData.append('images', img.file));

        await api.post(`/items/${itemId}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Cleanup preview URLs
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));

      // 3. Create Repair Request if selected
      if (data.createRepairRequest && data.problemDescription) {
        setStatusMessage('Creating repair request & running diagnosis...');
        const repairPayload = {
          itemId,
          problemDescription: data.problemDescription,
          eventBeforeIssue: data.eventBeforeIssue || undefined,
          budgetMinimum: data.budgetMinimum ? Number(data.budgetMinimum) : undefined,
          budgetMaximum: data.budgetMaximum ? Number(data.budgetMaximum) : undefined,
          preferredServiceMethod: data.preferredServiceMethod || undefined,
        };

        const { data: repairResp } = await api.post('/repair-requests', repairPayload);
        toast.success('Item added & repair request created!');
        navigate(`/repair-requests/${repairResp.data.repairRequest._id}`);
      } else {
        toast.success('Item added successfully!');
        navigate('/items');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save item');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const parentCategories = categories?.filter((c) => !c.parent) || [];

  return (
    <div className="page-container max-w-2xl px-4 sm:px-6">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-primary-600" />
          Add New Item
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Register your item, upload photos from mobile or PC, and optionally request a repair.
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

          {/* PHOTO UPLOAD SECTION (Fully mobile-optimized) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0 font-semibold text-gray-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary-600" />
                Item Photos / Images
              </label>
              <span className="text-xs text-gray-500 font-medium">
                {selectedImages.length} / {MAX_IMAGES} photos
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Add clear photos of your item showing any damage. (Max 5MB each)
            </p>

            {/* Drop & Mobile Tap Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all bg-white hover:bg-gray-50 active:bg-primary-50 ${
                dragOver
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-primary-300 hover:border-primary-500'
              } ${selectedImages.length >= MAX_IMAGES ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  validateAndAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                  {dragOver ? (
                    <Upload className="w-6 h-6 animate-bounce" />
                  ) : (
                    <ImagePlus className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Tap to Choose Photos or Take Picture
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Select from Camera, Gallery, or Drag & Drop (Max {MAX_IMAGES} photos)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="btn-secondary btn-sm mt-1 flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  Browse / Camera
                </button>
              </div>
            </div>

            {/* Live Previews */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                {selectedImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm"
                  >
                    <img
                      src={img.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-95"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 py-0.5 px-1">
                      <p className="text-[9px] text-white truncate text-center font-medium">
                        {img.file.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COMBINED REPAIR REQUEST SECTION */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-primary-50/60 rounded-xl border border-primary-100">
              <input
                {...register('createRepairRequest')}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-primary-900 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-primary-600" />
                  Request Repair for this item now
                </span>
                <p className="text-xs text-primary-700 mt-0.5">
                  Describe the issue and start receiving technician quotations.
                </p>
              </div>
            </label>

            {wantRepairRequest && (
              <div className="space-y-4 pl-2 border-l-2 border-primary-200 mt-3">
                <div>
                  <label className="label" htmlFor="problemDescription">
                    Problem Description *
                  </label>
                  <textarea
                    {...register('problemDescription')}
                    id="problemDescription"
                    rows={4}
                    className={`input resize-y text-sm ${
                      errors.problemDescription ? 'input-error' : ''
                    }`}
                    placeholder="Describe what is wrong in detail: what stopped working, noises, damage, symptoms..."
                  />
                  {errors.problemDescription && (
                    <p className="error-text">{errors.problemDescription.message}</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="eventBeforeIssue">
                    What happened before the issue? (Optional)
                  </label>
                  <input
                    {...register('eventBeforeIssue')}
                    id="eventBeforeIssue"
                    className="input"
                    placeholder="e.g., Dropped on floor, power outage, water spill..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Budget Range (৳)</label>
                    <div className="flex items-center gap-2">
                      <input
                        {...register('budgetMinimum')}
                        type="number"
                        className="input"
                        placeholder="Min (৳)"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        {...register('budgetMaximum')}
                        type="number"
                        className="input"
                        placeholder="Max (৳)"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="preferredServiceMethod">
                      Preferred Service Method
                    </label>
                    <select
                      {...register('preferredServiceMethod')}
                      id="preferredServiceMethod"
                      className="input"
                    >
                      <option value="">No preference</option>
                      <option value="onsite">On-site (Technician comes to me)</option>
                      <option value="pickup">Pickup (Technician picks up)</option>
                      <option value="dropoff">Drop-off (I bring item)</option>
                      <option value="remote">Remote (Online guidance)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ownership declaration */}
          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                {...register('ownershipDeclaration')}
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-xs text-gray-700">
                I declare that I am the rightful owner of this item and have the authority to submit it for repair, donation, or recycling. *
              </span>
            </label>
            {errors.ownershipDeclaration && (
              <p className="error-text mt-1">{errors.ownershipDeclaration.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !py-3.5 font-semibold text-base flex items-center justify-center gap-2 shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {statusMessage || 'Saving...'}
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                {wantRepairRequest ? 'Add Item & Create Repair Request' : 'Add Item to My Items'}
                {selectedImages.length > 0 && ` (${selectedImages.length} Photos)`}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
