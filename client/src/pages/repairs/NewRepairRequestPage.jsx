import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Upload,
  X,
  ImagePlus,
  Wrench,
  Package,
  Sparkles,
  Info,
} from 'lucide-react';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const schema = z.object({
  mode: z.enum(['new_item', 'existing_item']),
  // Existing item mode
  existingItemId: z.string().optional(),

  // New item mode fields
  title: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'broken', 'for_parts']).optional(),
  approximateAgeValue: z.coerce.number().min(0).optional(),
  approximateAgeUnit: z.enum(['days', 'months', 'years']).optional(),
  ownershipDeclaration: z.boolean().optional(),

  // Repair Request fields
  problemDescription: z.string().min(20, 'Please describe the problem in at least 20 characters').max(5000),
  eventBeforeIssue: z.string().optional(),
  previousRepairAttempts: z.string().optional(),
  budgetMinimum: z.coerce.number().min(0).optional(),
  budgetMaximum: z.coerce.number().min(0).optional(),
  preferredServiceMethod: z.enum(['onsite', 'pickup', 'dropoff', 'remote', '']).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === 'existing_item') {
    if (!data.existingItemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select an existing item',
        path: ['existingItemId'],
      });
    }
  } else {
    if (!data.title || data.title.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Title must be at least 3 characters',
        path: ['title'],
      });
    }
    if (!data.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Category is required',
        path: ['category'],
      });
    }
    if (!data.ownershipDeclaration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You must declare ownership of the item',
        path: ['ownershipDeclaration'],
      });
    }
  }
});

const conditions = [
  { value: 'broken', label: 'Broken', desc: 'Not working at all' },
  { value: 'poor', label: 'Poor', desc: 'Partially working, significant wear' },
  { value: 'fair', label: 'Fair', desc: 'Working, visible wear' },
  { value: 'good', label: 'Good', desc: 'Working, minor cosmetic wear' },
  { value: 'for_parts', label: 'For Parts', desc: 'Useful for parts' },
  { value: 'new', label: 'New', desc: 'Unused / like new' },
];

export default function NewRepairRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultItemId = searchParams.get('item') || '';

  const [mode, setMode] = useState(defaultItemId ? 'existing_item' : 'new_item');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data.categories),
  });

  // Fetch existing items for this owner
  const { data: itemsData } = useQuery({
    queryKey: ['my-items-all'],
    queryFn: () => api.get('/items?limit=100').then((r) => r.data.data),
  });

  const parentCategories = categories?.filter((c) => !c.parent) || [];
  const existingItems = itemsData?.items || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: defaultItemId ? 'existing_item' : 'new_item',
      existingItemId: defaultItemId,
      condition: 'broken',
      approximateAgeUnit: 'years',
      ownershipDeclaration: false,
      preferredServiceMethod: '',
    },
  });

  const selectedCondition = watch('condition');
  const activeMode = watch('mode');

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setValue('mode', newMode);
  };

  // Image Upload helpers
  const validateAndAddFiles = (files) => {
    const newFiles = Array.from(files);
    const remaining = MAX_IMAGES - selectedImages.length;

    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} photos allowed`);
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
      let finalItemId = data.existingItemId;

      // 1. If in "new_item" mode, create the item first
      if (data.mode === 'new_item') {
        setStatusMessage('Saving item details...');
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
        finalItemId = itemResp.data.item._id;

        // 2. Upload images to Cloudinary
        if (selectedImages.length > 0) {
          setStatusMessage(`Uploading ${selectedImages.length} photo(s)...`);
          const formData = new FormData();
          selectedImages.forEach((img) => formData.append('images', img.file));

          await api.post(`/items/${finalItemId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      // 3. Create the Repair Request
      setStatusMessage('Creating repair request & running analysis...');
      const repairPayload = {
        itemId: finalItemId,
        problemDescription: data.problemDescription,
        eventBeforeIssue: data.eventBeforeIssue || undefined,
        previousRepairAttempts: data.previousRepairAttempts || undefined,
        budgetMinimum: data.budgetMinimum ? Number(data.budgetMinimum) : undefined,
        budgetMaximum: data.budgetMaximum ? Number(data.budgetMaximum) : undefined,
        preferredServiceMethod: data.preferredServiceMethod || undefined,
      };

      const { data: repairResp } = await api.post('/repair-requests', repairPayload);
      const repairRequestId = repairResp.data.repairRequest._id;

      // Clean up object URLs
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));

      toast.success('Repair request created successfully!');
      navigate(`/repair-requests/${repairRequestId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="page-container max-w-3xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary-600" />
          Request a Repair
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Provide your item details and describe the problem in one simple form. Our AI and technicians will take care of the rest.
        </p>
      </div>

      {/* Mode Switcher */}
      {existingItems.length > 0 && (
        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl mb-6 max-w-md">
          <button
            type="button"
            onClick={() => handleModeChange('new_item')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeMode === 'new_item'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            + New Item & Repair
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('existing_item')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeMode === 'existing_item'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Select from My Items ({existingItems.length})
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* SECTION 1: ITEM DETAILS */}
        <div className="card card-body space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            <h2 className="font-semibold text-gray-900">
              {activeMode === 'existing_item' ? 'Choose Your Item' : 'Item Information'}
            </h2>
          </div>

          {activeMode === 'existing_item' ? (
            <div>
              <label className="label" htmlFor="existingItemId">
                Select Registered Item *
              </label>
              <select
                {...register('existingItemId')}
                id="existingItemId"
                className={`input ${errors.existingItemId ? 'input-error' : ''}`}
              >
                <option value="">Choose an item from your list</option>
                {existingItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title} ({item.brand || 'Item'})
                  </option>
                ))}
              </select>
              {errors.existingItemId && (
                <p className="error-text">{errors.existingItemId.message}</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="label" htmlFor="title">
                  Item Title *
                </label>
                <input
                  {...register('title')}
                  id="title"
                  className={`input ${errors.title ? 'input-error' : ''}`}
                  placeholder="e.g., Samsung Galaxy S21, Giant Talon 3 Bike, Kitchen Blender..."
                />
                {errors.title && <p className="error-text">{errors.title.message}</p>}
              </div>

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
                    Brand (Optional)
                  </label>
                  <input
                    {...register('brand')}
                    id="brand"
                    className="input"
                    placeholder="e.g., Samsung, Apple, Giant, Ikea"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="model">
                    Model (Optional)
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

              <div>
                <label className="label">Current Condition *</label>
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
                          selectedCondition === c.value
                            ? 'text-primary-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {c.label}
                      </span>
                      <span className="text-[11px] text-gray-500 mt-0.5">{c.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Photos Upload */}
              <div>
                <label className="label flex items-center justify-between">
                  <span>Item Photos</span>
                  <span className="text-xs text-gray-400 font-normal">
                    {selectedImages.length}/{MAX_IMAGES} uploaded
                  </span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Add clear photos showing the damaged part or general item condition.
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-primary-500 bg-primary-50'
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
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    {dragOver ? (
                      <Upload className="w-7 h-7 text-primary-500 animate-bounce" />
                    ) : (
                      <ImagePlus className="w-7 h-7 text-gray-400" />
                    )}
                    <p className="text-sm font-medium text-gray-700">
                      {dragOver ? 'Drop photos here' : 'Click to browse or drag and drop photos'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      JPEG, PNG, WebP up to 5MB each (Max {MAX_IMAGES})
                    </p>
                  </div>
                </div>

                {/* Live Previews */}
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
                    {selectedImages.map((img) => (
                      <div
                        key={img.id}
                        className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
                      >
                        <img
                          src={img.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm opacity-90 hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    {...register('ownershipDeclaration')}
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">
                    I declare that I am the rightful owner or custodian of this item and authorized to request repair. *
                  </span>
                </label>
                {errors.ownershipDeclaration && (
                  <p className="error-text mt-1">{errors.ownershipDeclaration.message}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* SECTION 2: PROBLEM & REPAIR PREFERENCES */}
        <div className="card card-body space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <h2 className="font-semibold text-gray-900">Problem & Repair Details</h2>
          </div>

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
              placeholder="Describe what is wrong in detail: what stopped working, symptoms, noises, physical damage, or error messages..."
            />
            {errors.problemDescription && (
              <p className="error-text">{errors.problemDescription.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="eventBeforeIssue">
                What happened before the issue? (Optional)
              </label>
              <textarea
                {...register('eventBeforeIssue')}
                id="eventBeforeIssue"
                rows={2}
                className="input resize-y text-sm"
                placeholder="e.g., Dropped on floor, thunderstorm, water spill..."
              />
            </div>
            <div>
              <label className="label" htmlFor="previousRepairAttempts">
                Previous repair attempts (Optional)
              </label>
              <textarea
                {...register('previousRepairAttempts')}
                id="previousRepairAttempts"
                rows={2}
                className="input resize-y text-sm"
                placeholder="e.g., Opened back cover, changed battery, attempted gluing..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Estimated Budget Range (৳)</label>
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
                <option value="">No preference (Any method)</option>
                <option value="onsite">On-site (Technician visits me)</option>
                <option value="pickup">Pickup (Technician collects item)</option>
                <option value="dropoff">Drop-off (I bring item to workshop)</option>
                <option value="remote">Remote (Online video guidance)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full !py-3.5 text-base shadow-md font-semibold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {statusMessage || 'Submitting Request...'}
            </>
          ) : (
            <>
              <Wrench className="w-5 h-5" />
              Submit Repair Request
              {selectedImages.length > 0 && ` (${selectedImages.length} Photos)`}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
