import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  ImagePlus,
  Wrench,
  Package,
  Sparkles,
  Shield,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Eye,
  Check,
  Send,
} from 'lucide-react';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const schema = z.object({
  mode: z.enum(['new_item', 'existing_item']),
  existingItemId: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'broken', 'for_parts']).optional(),
  approximateAgeValue: z.coerce.number().min(0).optional(),
  approximateAgeUnit: z.enum(['days', 'months', 'years']).optional(),
  ownershipDeclaration: z.boolean().optional(),
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

const STEPS = [
  { id: 1, label: 'Item Details', short: 'Item' },
  { id: 2, label: 'Problem & Event', short: 'Problem' },
  { id: 3, label: 'Safety Check', short: 'Safety' },
  { id: 4, label: 'AI Diagnosis', short: 'Diagnosis' },
  { id: 5, label: 'Review & Publish', short: 'Publish' },
];

export default function NewRepairRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultItemId = searchParams.get('item') || '';

  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState(defaultItemId ? 'existing_item' : 'new_item');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Diagnostic state
  const [createdRequestId, setCreatedRequestId] = useState(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [safetyFlagsResult, setSafetyFlagsResult] = useState([]);
  const [clarificationAnswers, setClarificationAnswers] = useState({});
  const [mobileClarifyIndex, setMobileClarifyIndex] = useState(0);

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
    trigger,
    getValues,
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

  // Advance step logic
  const handleNextStep = async () => {
    if (currentStep === 1) {
      const valid = await trigger(
        activeMode === 'existing_item'
          ? ['existingItemId']
          : ['title', 'category', 'condition', 'ownershipDeclaration']
      );
      if (!valid) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await trigger(['problemDescription']);
      if (!valid) return;

      // Submit and create request in background
      await createInitialRequest();
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    }
  };

  const createInitialRequest = async () => {
    setLoading(true);
    try {
      const data = getValues();
      let finalItemId = data.existingItemId;

      if (data.mode === 'new_item') {
        setStatusMessage('Saving item information...');
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

        if (selectedImages.length > 0) {
          setStatusMessage(`Uploading ${selectedImages.length} photo(s)...`);
          const formData = new FormData();
          selectedImages.forEach((img) => formData.append('images', img.file));

          await api.post(`/items/${finalItemId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      setStatusMessage('Analyzing safety screening...');
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
      const reqId = repairResp.data.repairRequest._id;
      setCreatedRequestId(reqId);

      // Run AI Diagnosis & Safety Rules
      setStatusMessage('Running safety checks & preliminary AI diagnosis...');
      const { data: analyzeResp } = await api.post(`/repair-requests/${reqId}/analyze`);
      setAiAnalysisResult(analyzeResp.data?.aiAnalysis);
      setSafetyFlagsResult(analyzeResp.data?.safetyFlags || []);

      setCurrentStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initialize repair request');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handlePublishNow = async () => {
    if (!createdRequestId) return;
    setLoading(true);
    try {
      // Submit clarification answers if any
      const answersArray = Object.entries(clarificationAnswers).map(([qIdx, ans]) => ({
        questionIndex: Number(qIdx),
        answer: ans,
      }));
      if (answersArray.length > 0) {
        await api.post(`/repair-requests/${createdRequestId}/answers`, { answers: answersArray });
      }

      await api.post(`/repair-requests/${createdRequestId}/publish`);
      toast.success('Repair request published to verified technicians!');
      navigate(`/repair-requests/${createdRequestId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish request');
    } finally {
      setLoading(false);
    }
  };

  const formValues = getValues();
  const clarificationQuestions = aiAnalysisResult?.clarificationQuestions || [];

  return (
    <div className="page-container max-w-3xl px-4 py-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => {
          if (currentStep > 1 && currentStep <= 2) setCurrentStep(currentStep - 1);
          else navigate(-1);
        }}
        className="btn-ghost btn-sm -ml-2 mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> {currentStep > 1 ? 'Previous Step' : 'Cancel'}
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary-600" />
          Guided Repair Request
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Follow our 5-step diagnostic process to get the fastest and most accurate technician quotes.
        </p>
      </div>

      {/* Step Stepper Progress Bar */}
      <div className="mb-8">
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center text-center">
              <div
                className={`h-2 w-full rounded-full transition-all duration-300 mb-1.5 ${
                  s.id < currentStep
                    ? 'bg-emerald-500'
                    : s.id === currentStep
                    ? 'bg-primary-600 ring-2 ring-primary-300 animate-pulse'
                    : 'bg-gray-200'
                }`}
              />
              <span
                className={`text-[11px] font-semibold ${
                  s.id === currentStep
                    ? 'text-primary-700 font-bold'
                    : s.id < currentStep
                    ? 'text-emerald-700'
                    : 'text-gray-400'
                }`}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.short}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: ITEM SELECTION & DETAILS */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {existingItems.length > 0 && (
            <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl max-w-md">
              <button
                type="button"
                onClick={() => handleModeChange('new_item')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'new_item'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                + New Item
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('existing_item')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'existing_item'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                My Items ({existingItems.length})
              </button>
            </div>
          )}

          <div className="card card-body space-y-4">
            <h2 className="section-title">
              {activeMode === 'existing_item' ? 'Choose Existing Item' : 'Item Information'}
            </h2>

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
                    placeholder="e.g. Samsung Galaxy S21, Kitchen Blender, Giant Talon 3..."
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
                      placeholder="e.g. Sony, Apple, Shimano"
                    />
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
                          className={`text-xs font-semibold ${
                            selectedCondition === c.value
                              ? 'text-primary-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {c.label}
                        </span>
                        <span className="text-[10px] text-gray-500 mt-0.5">{c.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Photos Upload */}
                <div>
                  <label className="label flex items-center justify-between">
                    <span>Photos of Damaged Item</span>
                    <span className="text-xs text-gray-400 font-normal">
                      {selectedImages.length}/{MAX_IMAGES} uploaded
                    </span>
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-gray-50"
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
                      <ImagePlus className="w-7 h-7 text-gray-400" />
                      <p className="text-xs font-medium text-gray-700">
                        Click to browse or drag photos
                      </p>
                      <p className="text-[10px] text-gray-400">Up to 5MB each (Max 5)</p>
                    </div>
                  </div>

                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-3">
                      {selectedImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative aspect-square rounded-xl overflow-hidden border border-gray-200"
                        >
                          <img
                            src={img.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                          >
                            <X className="w-3 h-3" />
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
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600"
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

          <button
            type="button"
            onClick={handleNextStep}
            className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <span>Continue to Problem Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: PROBLEM DESCRIPTION & PREFERENCES */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="card card-body space-y-4">
            <h2 className="section-title">Describe Problem & Symptoms</h2>

            <div>
              <label className="label" htmlFor="problemDescription">
                What is wrong with the item? *
              </label>
              <textarea
                {...register('problemDescription')}
                id="problemDescription"
                rows={4}
                className={`input resize-y text-sm ${
                  errors.problemDescription ? 'input-error' : ''
                }`}
                placeholder="Be as detailed as possible: symptoms, error codes, strange noises, when the issue started..."
              />
              {errors.problemDescription && (
                <p className="error-text">{errors.problemDescription.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="eventBeforeIssue">
                  Event before issue (Optional)
                </label>
                <textarea
                  {...register('eventBeforeIssue')}
                  id="eventBeforeIssue"
                  rows={2}
                  className="input resize-y text-xs"
                  placeholder="e.g., dropped, power surge, water exposure..."
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
                  className="input resize-y text-xs"
                  placeholder="e.g., opened casing, replaced battery..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="label">Estimated Budget Range (৳)</label>
                <div className="flex items-center gap-2">
                  <input
                    {...register('budgetMinimum')}
                    type="number"
                    className="input text-xs"
                    placeholder="Min (৳)"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    {...register('budgetMaximum')}
                    type="number"
                    className="input text-xs"
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
                  className="input text-xs"
                >
                  <option value="">Any service method</option>
                  <option value="onsite">On-site (Technician visits)</option>
                  <option value="pickup">Pickup (Technician collects)</option>
                  <option value="dropoff">Drop-off (I bring to workshop)</option>
                  <option value="remote">Remote guidance</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn-outline flex-1 py-3 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              disabled={loading}
              className="btn-primary flex-2 py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusMessage || 'Analyzing...'}
                </>
              ) : (
                <>
                  <span>Run Safety Screening & AI Diagnosis</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: SAFETY SCREENING RESULTS */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="card card-body space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Shield className="w-5 h-5 text-primary-600" />
              <h2 className="section-title">Automated Safety Screening</h2>
            </div>

            {safetyFlagsResult.length > 0 ? (
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-danger-900 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-danger-600 shrink-0" />
                  <span>Important Safety Hazards Detected</span>
                </div>
                <p className="text-xs text-danger-800 leading-relaxed">
                  Our safety screening rules identified potential hazards with this repair. Please review the warnings below:
                </p>
                <div className="space-y-2">
                  {safetyFlagsResult.map((flag, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-danger-200 text-xs text-danger-900 flex items-start gap-2">
                      <span className="badge-red shrink-0">{flag.severity}</span>
                      <span>{flag.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs">
                <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Safety Screening Passed Cleanly</h4>
                  <p className="text-emerald-700 mt-0.5">
                    No critical high-voltage or hazardous material risks were detected.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="btn-outline flex-1 py-3 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="btn-primary flex-2 py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>View AI Preliminary Diagnosis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: AI PRELIMINARY DIAGNOSIS & CLARIFICATIONS */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-purple-50/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900 text-sm">AI Preliminary Fault Diagnosis</h3>
              </div>
              <span className="badge-purple">{aiAnalysisResult?.confidence || 75}% confidence</span>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {aiAnalysisResult?.extractedSymptoms?.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Identified Symptoms
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {aiAnalysisResult.extractedSymptoms.map((s, i) => (
                      <div key={i} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                        <span className="font-medium text-gray-800">{s.description}</span>
                        <span className="badge-blue text-[10px]">{s.severity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clarification Questions */}
              {clarificationQuestions.length > 0 && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-primary-600" />
                      Clarification Questions for Better Quotes
                    </h4>
                    <span className="text-[10px] text-gray-400 sm:hidden">
                      {mobileClarifyIndex + 1} of {clarificationQuestions.length}
                    </span>
                  </div>

                  {/* Desktop view: list all; Mobile view: 1-at-a-time */}
                  <div className="space-y-3">
                    {clarificationQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className={`p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 ${
                          idx !== mobileClarifyIndex ? 'hidden sm:block' : ''
                        }`}
                      >
                        <p className="font-semibold text-gray-800 text-xs">{q}</p>
                        <input
                          type="text"
                          value={clarificationAnswers[idx] || ''}
                          onChange={(e) =>
                            setClarificationAnswers({
                              ...clarificationAnswers,
                              [idx]: e.target.value,
                            })
                          }
                          className="input text-xs bg-white"
                          placeholder="Your answer (optional)..."
                        />
                      </div>
                    ))}

                    {/* Mobile next question toggle */}
                    {clarificationQuestions.length > 1 && (
                      <div className="flex sm:hidden justify-between items-center pt-1">
                        <button
                          type="button"
                          disabled={mobileClarifyIndex === 0}
                          onClick={() => setMobileClarifyIndex(mobileClarifyIndex - 1)}
                          className="btn-outline btn-xs"
                        >
                          Prev Question
                        </button>
                        <button
                          type="button"
                          disabled={mobileClarifyIndex === clarificationQuestions.length - 1}
                          onClick={() => setMobileClarifyIndex(mobileClarifyIndex + 1)}
                          className="btn-outline btn-xs"
                        >
                          Next Question
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400 italic pt-2 border-t border-gray-50">
                Notice: AI preliminary advice is advisory only. Certified technicians will verify the actual physical symptoms during inspection.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="btn-outline flex-1 py-3 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="btn-primary flex-2 py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>Review & Publish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: PRE-PUBLISH SUMMARY & PUBLISH ACTION */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="card card-body space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Send className="w-5 h-5 text-primary-600" />
              <h2 className="section-title">Final Review & Publishing</h2>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2.5">
              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                Pre-Publication Summary
              </h4>
              <div className="flex justify-between">
                <span className="text-gray-500">Item:</span>
                <span className="font-bold text-gray-900">{formValues.title || 'Selected Item'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Problem Summary:</span>
                <span className="font-medium text-gray-800 truncate max-w-xs">{formValues.problemDescription}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Budget:</span>
                <span className="font-bold text-gray-900">
                  {formValues.budgetMinimum ? `৳${formValues.budgetMinimum} – ৳${formValues.budgetMaximum}` : 'Flexible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Safety Screening:</span>
                <span className="font-bold text-emerald-700">
                  {safetyFlagsResult.length ? `${safetyFlagsResult.length} flags attached` : 'Passed'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
              Once published, certified local technicians will be notified and can submit competitive quotations for your review.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate(`/repair-requests/${createdRequestId}`)}
              className="btn-outline flex-1 py-3 text-xs"
            >
              Save as Draft & Finish Later
            </button>
            <button
              type="button"
              onClick={handlePublishNow}
              disabled={loading}
              className="btn-primary flex-2 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Publishing Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish to Technicians Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
